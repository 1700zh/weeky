import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAUhzSKztimxX4VaTt1M7YbKggrylFsscw",
  authDomain: "weeky-bb140.firebaseapp.com",
  projectId: "weeky-bb140",
  storageBucket: "weeky-bb140.appspot.com",
  messagingSenderId: "85721029380",
  appId: "1:85721029380:web:17fc39d6cd6a95fdbace51"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
