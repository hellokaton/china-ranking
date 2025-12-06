import { Octokit } from "octokit";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// GitHub Token (可通过环境变量设置)
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// 需要过滤的组织列表
const organizationsToFilter = [
  "alibaba",
  "tencent",
  "bytedance",
  "open-mmlab",
  "baidu",
  "ant-design",
  "apache",
  "microsoft",
  "oschina",
  "tshemsedinov" // 非中国
  // 添加更多需要过滤的组织
];

// Octokit 高级配置
const octokit = new Octokit({
  auth: GITHUB_TOKEN,
  throttle: {
    onRateLimit: (retryAfter, options, octokit, retryCount) => {
      console.warn(`触发限流! 请求: ${options.method} ${options.url}`);
      console.warn(`${retryCount + 1} 重试，${retryAfter} 秒后...`);
      return retryCount < 3; // 只重试3次
    },
    onSecondaryRateLimit: (retryAfter, options, octokit) => {
      // 次要限流 (滥用检测)
      console.warn(`触发次要限流! 请求: ${options.method} ${options.url}`);
      return false; // 不自动重试次要限流
    },
  },
});

// 添加检查当前 API 限流状态的函数
async function checkRateLimitStatus() {
  try {
    const { data } = await octokit.rest.rateLimit.get();
    const { rate } = data;

    const remaining = rate.remaining;
    const limit = rate.limit;
    const resetTime = new Date(rate.reset * 1000);
    const now = new Date();
    const minutesUntilReset = Math.round((resetTime - now) / 60000);

    console.log(`API 限流状态: ${remaining}/${limit} 剩余请求`);
    console.log(
      `重置时间: ${resetTime.toLocaleString()} (约 ${minutesUntilReset} 分钟后)`
    );

    return { remaining, limit, resetTime, minutesUntilReset };
  } catch (error) {
    console.error("获取限流状态失败:", error);
    return null;
  }
}

// 添加 API 请求限速函数
async function rateLimitedRequest(requestFn, maxRetries = 3) {
  let retries = 0;
  let lastError = null;

  while (retries <= maxRetries) {
    try {
      // 指数退避延迟，根据重试次数增加等待时间
      if (retries > 0) {
        const delay = Math.pow(2, retries) * 1000 + Math.random() * 1000;
        console.log(`等待 ${Math.round(delay / 1000)} 秒后重试...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      return await requestFn();
    } catch (error) {
      lastError = error;

      // 检查是否是速率限制错误
      if (error.status === 403 && error.message.includes("rate limit")) {
        const resetTime = error.response?.headers?.["x-ratelimit-reset"];
        if (resetTime) {
          // 获取重置时间并适当等待
          const waitTime = Number(resetTime) * 1000 - Date.now() + 1000;
          if (waitTime > 0 && waitTime < 3600000) {
            // 最多等待1小时
            console.log(
              `达到 API 速率限制，等待 ${Math.round(
                waitTime / 1000
              )} 秒后继续...`
            );
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            retries--; // 不计入重试次数
            continue;
          }
        }
      }

      retries++;
      console.error(`请求失败 (${retries}/${maxRetries}):`, error.message);

      if (retries > maxRetries) {
        throw lastError;
      }
    }
  }
}

// 计算用户公开仓库的总 star 数
async function fetchUserStars(username) {
  const perPage = 100;
  let page = 1;
  let stars = 0;

  try {
    while (true) {
      const repoResponse = await rateLimitedRequest(async () => {
        return await octokit.rest.repos.listForUser({
          username,
          per_page: perPage,
          page,
          sort: "updated",
          direction: "desc",
          type: "owner",
        });
      });

      const repos = repoResponse.data || [];
      stars += repos.reduce(
        (sum, repo) => sum + (repo.stargazers_count || 0),
        0
      );

      // 少于一页，说明已拿到全部仓库
      if (repos.length < perPage) {
        break;
      }

      page++;
      // 轻微延迟，降低速率限制风险
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  } catch (error) {
    console.error(`获取 ${username} 总 star 数失败:`, error.message);
  }

  return stars;
}

async function fetchTopChineseUsers() {
  try {
    // 检查初始 API 限流状态
    const initialStatus = await checkRateLimitStatus();
    if (initialStatus && initialStatus.remaining < 100) {
      console.warn(
        `警告: API 请求配额较低 (${initialStatus.remaining}/${initialStatus.limit})，可能会触发限流`
      );
      if (initialStatus.minutesUntilReset < 30) {
        console.log(
          `建议等待 ${initialStatus.minutesUntilReset} 分钟后再运行脚本`
        );
      }
    }

    console.log("开始获取中国用户数据...");

    // 使用 GitHub API 搜索中国区用户
    let allUsers = [];

    // 按不同维度分割搜索条件，突破1000条结果限制
    const searchQueries = [
      // 按照粉丝数量分段
      { location: "china", followers: "500..1000", sort: "followers" },
      { location: "china", followers: ">1000", sort: "followers" }, // 目前这个范围只有 580 个人
      { location: "beijing", followers: ">1000", sort: "followers" },
      { location: "shanghai", followers: ">1000", sort: "followers" },
      { location: "hangzhou", followers: ">1000", sort: "followers" },
      { location: "shenzhen", followers: ">1000", sort: "followers" },
      { location: "wuhan", followers: ">1000", sort: "followers" },
      { location: "zhengzhou", followers: ">1000", sort: "followers" },
    ];

    // 设置搜索参数和结果缓存
    const searchCache = new Map();
    // 设置每个查询最大获取的页数
    const maxPages = 10;
    console.log(`设置每个查询最大获取页数为: ${maxPages}`);

    for (const query of searchQueries) {
      const { location, followers, sort } = query;
      const queryString = `type:user location:${location} followers:${followers}`;
      console.log(`执行搜索查询: ${queryString}, 排序方式: ${sort}`);
      let queryUsers = [];

      // 循环获取多页数据
      for (let page = 1; page <= maxPages; page++) {
        console.log(
          `获取查询 [${queryString}] 的第 ${page}/${maxPages} 页数据`
        );

        // 检查是否还有足够的请求配额
        const status = await checkRateLimitStatus();
        if (status && status.remaining < 10) {
          console.log(`API 请求配额不足，等待直到重置...`);
          const waitTime = status.resetTime - new Date() + 1000;
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }

        // 使用限速请求获取用户数据
        const data = await rateLimitedRequest(async () => {
          const cacheKey = `query:${queryString}:sort:${sort}:page:${page}`;
          if (searchCache.has(cacheKey)) {
            console.log(`使用缓存数据: ${cacheKey}`);
            return searchCache.get(cacheKey);
          }

          const response = await octokit.rest.search.users({
            q: `${queryString} type:user sort:${sort}`,
            per_page: 100,
            page: page,
          });

          // 缓存结果
          searchCache.set(cacheKey, response.data);
          return response.data;
        });

        // 添加到用户列表中
        queryUsers = [...queryUsers, ...data.items];
        console.log(`第 ${page} 页找到 ${data.items.length} 名用户`);

        // 如果当前页返回的用户数量少于请求的数量或为0，说明已没有更多数据
        if (data.items.length < 100) {
          if (data.items.length === 0) {
            console.log(
              `查询 [${queryString}] 第 ${page} 页没有数据，停止获取后续页面`
            );
          } else {
            console.log(
              `查询 [${queryString}] 的数据已全部获取，共 ${page} 页`
            );
          }
          break;
        }

        // 适当延迟以减轻 API 负担
        if (page < maxPages) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      console.log(`查询 [${queryString}] 共找到 ${queryUsers.length} 名用户`);
      allUsers = [...allUsers, ...queryUsers];

      // 查询之间添加延迟
      if (searchQueries.indexOf(query) < searchQueries.length - 1) {
        console.log("等待进行下一个查询...");
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    // 去重处理
    console.log(`所有查询共获取到 ${allUsers.length} 个用户记录，开始去重...`);
    
    const uniqueUsers = [];
    const uniqueIds = new Set();
    let duplicateCount = 0;
    let organizationFilteredCount = 0;

    for (const user of allUsers) {
      if (!uniqueIds.has(user.id)) {
        // 过滤掉组织列表中的账号
        if (organizationsToFilter.includes(user.login.toLowerCase())) {
          console.log(`过滤组织账号: ${user.login}`);
          organizationFilteredCount++;
          continue;
        }
        uniqueIds.add(user.id);
        uniqueUsers.push(user);
      } else {
        duplicateCount++;
      }
    }

    console.log(`统计信息:
- 原始数据总量: ${allUsers.length} 条
- 重复记录: ${duplicateCount} 条
- 过滤组织账号: ${organizationFilteredCount} 条
- 去重后用户数量: ${uniqueUsers.length} 条`);

    // 原始数据中没有 followers_count，先不排序
    console.log(`开始获取 ${uniqueUsers.length} 名用户的详细信息`);

    // 分批处理用户详情请求，避免过多并发请求
    const batchSize = 5; // 每批处理用户数
    const sortedUsers = [];

    for (let i = 0; i < uniqueUsers.length; i += batchSize) {
      const batch = uniqueUsers.slice(i, i + batchSize);
      console.log(
        `处理用户详情批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          uniqueUsers.length / batchSize
        )}`
      );

      const batchResults = await Promise.all(
        batch.map(async (user) => {
          try {
            // 使用限速请求获取用户详情
            const userData = await rateLimitedRequest(async () => {
              const response = await octokit.rest.users.getByUsername({
                username: user.login,
              });
              return response.data;
            });

            // 不再需要通过type过滤，因为查询参数已经指定了type:user
            return {
              login: userData.login,
              name: userData.name || userData.login,
              avatar_url: userData.avatar_url,
              html_url: userData.html_url,
              followers: userData.followers,
              stars: await fetchUserStars(user.login),
              public_repos: userData.public_repos,
              bio: userData.bio,
              location: userData.location,
              twitter_username: userData.twitter_username,
              blog: userData.blog,
              company: userData.company,
            };
          } catch (error) {
            console.error(`获取用户详情出错: ${user.login}`, error);
            return null;
          }
        })
      );

      // 添加有效结果到排序用户列表
      sortedUsers.push(...batchResults.filter((user) => user !== null));

      // 批次间添加延迟
      if (i + batchSize < uniqueUsers.length) {
        console.log("批次处理完成，等待下一批...");
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }

    // 添加最后更新时间
    const data = {
      updateTime: new Date().toISOString(),
      developers: sortedUsers,
    };

    // 创建数据目录（如果不存在）
    const dataDir = path.resolve(__dirname, "../public/data");
    await fs.mkdir(dataDir, { recursive: true });

    // 写入 JSON 文件
    await fs.writeFile(
      path.resolve(dataDir, "github-ranking.json"),
      JSON.stringify(data, null, 2)
    );

    console.log(`获取完成！共有 ${sortedUsers.length} 名开发者。`);

    // 最终检查 API 状态
    await checkRateLimitStatus();
  } catch (error) {
    console.error("获取用户数据失败:", error);
  }
}

fetchTopChineseUsers();
