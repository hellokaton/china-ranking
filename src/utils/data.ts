// 加载 GitHub 用户排行数据
import { markdownDevelopers } from "@/utils/markdown-developers.ts";

export interface GitHubUser {
  login: string;
  name: string;
  avatar_url: string;
  html_url: string;
  followers: number;
  stars: number;
  public_repos: number;
  bio?: string;
  location?: string;
  blog?: string;
  company?: string;
  twitter_username?: string;
  type?: "code" | "markdown";
}

export interface RankingData {
  updateTime: string;
  developers: GitHubUser[];
}

export type DeveloperType = "all" | "code" | "markdown";

// 获取排行榜数据
export async function getRankingData(type: DeveloperType = "all"): Promise<{
  updateTime: string;
  developers: GitHubUser[];
}> {
  try {
    // 使用绝对URL路径或使用import.meta.env.BASE_URL构建完整URL
    const response = await fetch(
      `${import.meta.env.SITE}/data/github-ranking.json`
    );

    if (!response.ok) {
      throw new Error(`获取数据失败: ${response.statusText}`);
    }

    const data: RankingData = await response.json();

    // 按类型过滤开发者
    let filteredDevelopers = data.developers;
    if (type !== "all") {
      filteredDevelopers = data.developers.filter((dev: GitHubUser) =>
        type === "markdown"
          ? markdownDevelopers.includes(dev.login)
          : !markdownDevelopers.includes(dev.login)
      );
    }

    // 按照 followers 数量从高到低排序
    filteredDevelopers.sort((a, b) => b.followers - a.followers);

    return {
      updateTime: data.updateTime,
      developers: filteredDevelopers.slice(0, 1000),
    };
  } catch (error) {
    console.error("获取排行数据出错:", error);

    // 返回空数据结构
    return {
      updateTime: new Date().toISOString(),
      developers: [],
    };
  }
}
