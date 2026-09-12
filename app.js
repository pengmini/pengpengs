// ===================================================
// 우리 반 담벼락 - Firebase Firestore 연동
//
// Firebase Firestore를 연결하여 메모를 실시간으로 저장하고 불러옵니다.
// ===================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyAH6wW4Nq86lIthYlabFGaCbOoXx52QKLM",
  authDomain: "class-english.firebaseapp.com",
  projectId: "class-english",
  storageBucket: "class-english.firebasestorage.app",
  messagingSenderId: "956248943757",
  appId: "1:956248943757:web:a4851541c0c00457d846c4",
  measurementId: "G-BGJVR4NL0H"
};

// Firebase, Firestore, Auth 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// 현재 로그인한 사용자 정보 (로그아웃 상태면 null)
let currentUser = null;


// --- 메모 목록 ---
// Firestore에서 실시간으로 불러온 메모들을 담아둘 배열입니다.
let memos = [];


// ===================================================
// 데이터를 다루는 함수 세 개
// Firestore를 사용하여 메모를 읽고, 쓰고, 지웁니다.
// ===================================================

// 메모를 읽어 옵니다.
// Firestore의 memos 컬렉션을 createdAt 오름차순으로 실시간 감시(onSnapshot)합니다.
function loadMemos() {
  const q = query(collection(db, "memos"), orderBy("createdAt", "asc"));
  onSnapshot(q, function (snapshot) {
    memos = [];
    snapshot.forEach(function (docSnap) {
      memos.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });
    render(); // 데이터가 변경될 때마다 화면을 새로 그립니다
  });
}

// 메모를 새로 씁니다.
// 백엔드 2: 여기에 "누가 썼는지"(uid)를 함께 저장하게 됩니다.
async function addMemo(text) {
  try {
    // 보안 규칙 검증: 5자 이상 50자 이하
    if (text.length < 5) {
      alert("메모는 5글자 이상 작성해 주세요.");
      return;
    }
    if (text.length > 50) {
      alert("메모는 50자 이하로 작성해 주세요.");
      return;
    }

    await addDoc(collection(db, "memos"), {
      text: text,
      createdAt: serverTimestamp() // Firestore 서버 시각(request.time)으로 저장
    });
  } catch (error) {
    console.error("메모 추가 실패:", error);
    alert("메모를 저장하지 못했습니다. 다시 시도해 주세요.");
  }
}

// 메모를 지웁니다.
// 백엔드 2: 지금은 누구든 남의 메모를 지울 수 있습니다. 이걸 막는 것이 과제입니다.
async function deleteMemo(id) {
  try {
    await deleteDoc(doc(db, "memos", id));
  } catch (error) {
    console.error("메모 삭제 실패:", error);
    alert("메모를 삭제하지 못했습니다. 다시 시도해 주세요.");
  }
}


// ===================================================
// 화면 그리기
// ===================================================

function render() {
  const wall = document.getElementById("wall");
  wall.innerHTML = "";

  memos.forEach(function (memo) {
    wall.appendChild(makeMemo(memo));
  });
}

// 메모 한 장 만들기
function makeMemo(memo) {
  const div = document.createElement("div");
  div.className = "memo";

  const del = document.createElement("button");
  del.textContent = "×";
  // 인라인 속성 대신 addEventListener로 이벤트 등록
  del.addEventListener("click", function () {
    deleteMemo(memo.id);
  });
  div.appendChild(del);

  const span = document.createElement("span");
  span.textContent = memo.text;
  div.appendChild(span);

  return div;
}


// ===================================================
// 메모 쓰는 칸
// 엔터를 누르면 담벼락에 붙습니다 (줄바꿈은 Shift + 엔터)
// ===================================================

const input = document.getElementById("input");

input.addEventListener("keydown", async function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();

    const text = input.value.trim();
    if (text === "") return;

    if (text.length < 5) {
      alert("메모는 5글자 이상 작성해 주세요.");
      return;
    }

    input.value = "";
    await addMemo(text);
  }
});


// ===================================================
// 로그인 영역 그리기 (백엔드 2)
// ===================================================

function renderUserArea() {
  const userArea = document.getElementById("userArea");
  if (!userArea) return;

  userArea.innerHTML = "";

  if (currentUser) {
    // 로그인 상태: 사용자 이름(또는 이메일)과 로그아웃 버튼 표시
    const nameSpan = document.createElement("span");
    nameSpan.textContent = `${currentUser.displayName || currentUser.email || "사용자"}님 환영합니다! `;
    nameSpan.style.marginRight = "8px";

    const logoutBtn = document.createElement("button");
    logoutBtn.textContent = "로그아웃";
    logoutBtn.addEventListener("click", async function () {
      try {
        await signOut(auth);
      } catch (error) {
        console.error("로그아웃 실패:", error);
        alert("로그아웃 중 오류가 발생했습니다.");
      }
    });

    userArea.appendChild(nameSpan);
    userArea.appendChild(logoutBtn);
  } else {
    // 로그아웃 상태: Google 로그인 버튼 표시
    const loginBtn = document.createElement("button");
    loginBtn.textContent = "Google로 로그인";
    loginBtn.addEventListener("click", async function () {
      try {
        await signInWithPopup(auth, provider);
      } catch (error) {
        console.error("로그인 실패:", error);
        if (error.code !== "auth/popup-closed-by-user") {
          alert("로그인에 실패했습니다. Firebase 콘솔의 Authentication 승인 도메인을 확인해 주세요.");
        }
      }
    });

    userArea.appendChild(loginBtn);
  }
}


// 실시간 메모 읽기 시작
loadMemos();
input.focus();

// 로그인 상태 감시 시작
onAuthStateChanged(auth, function (user) {
  currentUser = user;
  renderUserArea();
});

