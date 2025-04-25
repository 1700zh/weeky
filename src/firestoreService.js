import { db } from "./firebase";
import {
  doc,
  setDoc,
  getDocs,
  collection,
  onSnapshot,
  getDoc
} from "firebase/firestore";

// ✅ 上传用户的 availability（完整覆盖写，确保取消有效）
export async function uploadAvailability(groupId, userId, availability) {
  const ref = doc(db, "groups", groupId, "users", userId);

  // 获取原始数据（保留 submitted 字段等其他信息）
  const snapshot = await getDoc(ref);
  const oldData = snapshot.exists() ? snapshot.data() : {};

  // 构建新的 availability，清除空周数据（设置为 null 会在 setDoc merge:true 时删除字段）
  const cleanedAvailability = {};
  for (const weekKey in availability) {
    if (
      availability[weekKey] &&
      Object.keys(availability[weekKey]).length === 0
    ) {
      cleanedAvailability[weekKey] = null;
    } else {
      cleanedAvailability[weekKey] = availability[weekKey];
    }
  }

  // ✅ 合并原有字段，明确覆盖 availability
  await setDoc(ref, {
    ...oldData,
    availability: cleanedAvailability,
  });
}

// 标记该用户为已提交
export async function submitAvailability(groupId, userId) {
  const ref = doc(db, "groups", groupId, "users", userId);
  await setDoc(ref, { submitted: true }, { merge: true });
}

// 获取所有用户数据（一次性）
export async function fetchGroupAvailability(groupId) {
  const snapshot = await getDocs(collection(db, "groups", groupId, "users"));
  const all = {};
  snapshot.forEach(doc => {
    all[doc.id] = doc.data();
  });
  return all;
}

// 实时订阅某个群组的 users 数据
export function subscribeToGroupAvailability(groupId, callback) {
  return onSnapshot(collection(db, "groups", groupId, "users"), snapshot => {
    const all = {};
    snapshot.forEach(doc => {
      all[doc.id] = doc.data();
    });
    callback(all);
  });
}
