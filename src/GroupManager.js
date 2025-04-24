// GroupManager.js

// 随机生成 groupId（作为 URL 参数）
export function generateGroupId() {
    return Math.random().toString(36).substring(2, 10);
  }
  
  // 获取 groupId（从 URL），如果没有就生成一个并写入 URL
  export function getOrCreateGroupId() {
    const urlParams = new URLSearchParams(window.location.search);
    let groupId = urlParams.get("groupId");
  
    if (!groupId) {
      groupId = generateGroupId();
      urlParams.set("groupId", groupId);
      const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
      window.history.replaceState({}, "", newUrl);
    }
  
    return groupId;
  }
  
  // 构造 localStorage 键名
  export function getStorageKey(groupId) {
    return `availability-${groupId}`;
  }
  
  // 生成分享链接
  export function getShareLink(groupId) {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?groupId=${groupId}`;
  }
  
  // ✅ 获取或生成 userId（缓存到 localStorage）
  export function getOrCreateUserId() {
    let userId = localStorage.getItem("user-id");
    if (!userId) {
      userId = "user-" + Math.random().toString(36).substring(2, 10);
      localStorage.setItem("user-id", userId);
    }
    return userId;
  }
  