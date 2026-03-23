import { initializeApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  Auth, 
  signInWithPhoneNumber, 
  ConfirmationResult,
  signInWithCredential,
  PhoneAuthProvider,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  Firestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { 
  getStorage, 
  FirebaseStorage 
} from 'firebase/storage';

// ========== Firebase 配置 ==========
// TODO: 请在 Firebase Console 创建项目后填入配置
// https://console.firebase.google.com/

const firebaseConfig = {
  apiKey: "AIzaSyCzHCFeI9F93W2cYtNcTPY53Xxls4c2gPM",
  authDomain: "vibud-0812.firebaseapp.com",
  projectId: "vibud-0812",
  storageBucket: "vibud-0812.firebasestorage.app",
  messagingSenderId: "149969908954",
  appId: "1:149969908954:web:028cf233a4c3b09b5821e3"
};

// ========== 初始化 ==========
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

export const initFirebase = () => {
  if (!app) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  }
  return { app, auth, db, storage };
};

// ========== 认证服务 ==========

// 发送短信验证码 (Web端需要recaptcha verifier)
export const sendPhoneVerification = async (phoneNumber: string, container?: any): Promise<ConfirmationResult> => {
  if (!auth) initFirebase();
  
  // Web端使用 Invisible reCAPTCHA
  if (typeof window !== 'undefined') {
    const { getReactNativePersistence } = await import('firebase/auth');
    // 重新初始化带 Persistence 的 auth
    const auth = getAuth(app);
    
    // 创建 verifier
    const verifier = {
      verify: async () => 'recaptcha-token'
    };
    
    // 对于 React Native Web，可能需要不同的处理
    // 这里简化处理 - 实际应该用 firebase/auth/react-native
  }
  
  const confirmation = await signInWithPhoneNumber(auth, phoneNumber);
  return confirmation;
};

// 验证短信码登录
export const verifyPhoneCode = async (verificationId: string, code: string) => {
  if (!auth) initFirebase();
  const credential = PhoneAuthProvider.credential(verificationId, code);
  const result = await signInWithCredential(auth, credential);
  return result.user;
};

// 退出登录
export const logout = async () => {
  if (!auth) initFirebase();
  await signOut(auth);
};

// 监听登录状态
export const onAuthChange = (callback: (user: User | null) => void) => {
  if (!auth) initFirebase();
  return onAuthStateChanged(auth, callback);
};

// 获取当前用户
export const getCurrentUser = (): User | null => {
  if (!auth) initFirebase();
  return auth.currentUser;
};

// ========== Firestore 数据模型 ==========

// 用户资料
export interface UserProfile {
  id: string;                    // 用户ID (uid)
  phone?: string;                // 手机号
  nickname?: string;             // 昵称
  avatar?: string;               // 头像URL
  createdAt: any;                // 创建时间
  updatedAt: any;                // 更新时间
  stats?: {
    confessionCount: number;    // 倾诉次数
    treeholeCount: number;     // 树洞发帖数
    timeMachineCount: number;  // 时光机记录数
    continuousDays: number;     // 连续天数
  };
}

// 倾诉记录
export interface Confession {
  id: string;
  userId: string;
  text: string;
  mode: 'heal' | 'consult';
  timestamp: any;
  reply?: string;
}

// 树洞帖子
export interface TreeHolePost {
  id: string;
  userId: string;
  text: string;
  timestamp: any;
  likes: number;
  likedBy?: string[];           // 点赞用户ID列表
}

// 时光机记录
export interface TimeMachineEntry {
  id: string;
  userId: string;
  text: string;
  mood?: string;
  imageUrl?: string;
  timestamp: any;
}

// 收藏
export interface Favorite {
  id: string;
  userId: string;
  type: 'confession' | 'treehole' | 'timemachine';
  targetId: string;
  timestamp: any;
}

// ========== Firestore 操作 ==========

// 创建/更新用户资料
export const saveUserProfile = async (profile: UserProfile) => {
  if (!db) initFirebase();
  const userRef = doc(db, 'users', profile.id);
  await setDoc(userRef, {
    ...profile,
    updatedAt: serverTimestamp()
  }, { merge: true });
};

// 获取用户资料
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  if (!db) initFirebase();
  const userRef = doc(db, 'users', userId);
  const snapshot = await getDoc(userRef);
  return snapshot.exists() ? snapshot.data() as UserProfile : null;
};

// 保存倾诉记录
export const saveConfession = async (confession: Omit<Confession, 'id'>) => {
  if (!db) initFirebase();
  const id = doc(collection(db, 'confessions')).id;
  await setDoc(doc(db, 'confessions', id), {
    ...confession,
    id,
    timestamp: serverTimestamp()
  });
  return id;
};

// 获取用户倾诉记录
export const getUserConfessions = async (userId: string, limitCount = 50) => {
  if (!db) initFirebase();
  const q = query(
    collection(db, 'confessions'),
    where('userId', '==', userId),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as Confession);
};

// 发布树洞
export const postTreeHole = async (post: Omit<TreeHolePost, 'id'>) => {
  if (!db) initFirebase();
  const id = doc(collection(db, 'treehole')).id;
  await setDoc(doc(db, 'treehole', id), {
    ...post,
    id,
    timestamp: serverTimestamp()
  });
  return id;
};

// 获取树洞列表
export const getTreeHolePosts = async (limitCount = 100) => {
  if (!db) initFirebase();
  const q = query(
    collection(db, 'treehole'),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as TreeHolePost);
};

// 点赞树洞
export const likeTreeHole = async (postId: string, userId: string) => {
  if (!db) initFirebase();
  const postRef = doc(db, 'treehole', postId);
  const post = await getDoc(postRef);
  if (post.exists()) {
    const data = post.data() as TreeHolePost;
    const likedBy = data.likedBy || [];
    if (!likedBy.includes(userId)) {
      await updateDoc(postRef, {
        likes: (data.likes || 0) + 1,
        likedBy: [...likedBy, userId]
      });
    }
  }
};

// 添加收藏
export const addFavorite = async (userId: string, type: Favorite['type'], targetId: string) => {
  if (!db) initFirebase();
  const id = `${userId}_${type}_${targetId}`;
  await setDoc(doc(db, 'favorites', id), {
    id,
    userId,
    type,
    targetId,
    timestamp: serverTimestamp()
  });
};

// 获取用户收藏
export const getUserFavorites = async (userId: string) => {
  if (!db) initFirebase();
  const q = query(
    collection(db, 'favorites'),
    where('userId', '==', userId),
    orderBy('timestamp', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as Favorite);
};

// 保存时光机记录
export const saveTimeMachineEntry = async (entry: Omit<TimeMachineEntry, 'id'>) => {
  if (!db) initFirebase();
  const id = doc(collection(db, 'timemachine')).id;
  await setDoc(doc(db, 'timemachine', id), {
    ...entry,
    id,
    timestamp: serverTimestamp()
  });
  return id;
};

// 获取用户时光机记录
export const getUserTimeMachine = async (userId: string, limitCount = 50) => {
  if (!db) initFirebase();
  const q = query(
    collection(db, 'timemachine'),
    where('userId', '==', userId),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as TimeMachineEntry);
};

// 更新用户统计
export const updateUserStats = async (userId: string, stats: Partial<UserProfile['stats']>) => {
  if (!db) initFirebase();
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    'stats': stats
  });
};

export { auth, db, storage, User };
