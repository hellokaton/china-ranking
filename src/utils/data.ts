// 加载 GitHub 用户排行数据
import { markdownDevelopers } from "@/utils/markdown-developers.ts";
import rankingData from "../../public/data/github-ranking.json";

export interface GitHubUser {
  login: string;
  name: string;
  avatar_url: string;
  html_url: string;
  followers: number;
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
    const data = rankingData as RankingData;

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
