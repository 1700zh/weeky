import { db } from "./firebase";
import {
  doc,
  setDoc,
  getDocs,
  collection,
  onSnapshot
} from "firebase/firestore";

// 上传用户的 availability（覆盖写）
export async function uploadAvailability(groupId, userId, availability) {
  const ref = doc(db, "groups", groupId, "users", userId);
  await setDoc(ref, { availability }, { merge: true });
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
