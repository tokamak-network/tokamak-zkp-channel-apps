# ZKP Channel Verifier

Intermediate Proof 검증 및 State Channel 기반 새로운 Proof 생성을 위한 Electron 애플리케이션입니다.

## 주요 기능

### 1. Intermediate Proof 검증
- Proof 파일과 EVM State 관련 파일들이 포함된 ZIP 파일 업로드
- tokamak-zk-evm 바이너리를 통한 Proof 검증 실행
- 검증 결과(True/False) 표시

### 2. 새로운 Proof 생성
- State Channel의 마지막 상태 파일 업로드
- 토큰 전송 정보 입력 (수신자 주소, 금액)
- tokamak-zk-evm 바이너리를 통한 Proof 생성
- 생성된 Proof 및 관련 파일들을 ZIP으로 다운로드

## 개발 환경 설정

### 필수 요구사항
- Node.js 18 이상
- npm 또는 yarn

### 설치

```bash
npm install
```

### 개발 모드 실행

```bash
npm start
```

### 빌드

```bash
npm run make
```

## 프로젝트 구조

```
zkp-channel-verifier/
├── src/
│   ├── main.ts              # Electron 메인 프로세스
│   ├── preload.ts           # Preload 스크립트
│   ├── renderer.tsx         # React 렌더러 진입점
│   ├── App.tsx              # 메인 App 컴포넌트
│   ├── style.css            # 전역 스타일
│   ├── pages/               # 페이지 컴포넌트
│   │   ├── MainMenu.tsx     # 메인 메뉴 화면
│   │   ├── VerifyProof.tsx  # Proof 검증 화면
│   │   └── GenerateProof.tsx # Proof 생성 화면
│   ├── types/               # TypeScript 타입 정의
│   └── binaries/            # tokamak-zk-evm 바이너리 파일
├── package.json
├── tsconfig.json
├── forge.config.ts
└── README.md
```

## 사용 방법

### 1. 메인 화면
앱을 실행하면 두 가지 메뉴가 표시됩니다:
- **Intermediate Proof 검증**: 기존 Proof를 검증
- **새로운 Proof 생성**: State Channel 기반 새 Proof 생성

### 2. Intermediate Proof 검증
1. "Intermediate Proof 검증" 메뉴 클릭
2. Proof 파일과 EVM state 파일이 포함된 ZIP 파일 업로드
3. "Verify 실행" 버튼 클릭
4. 검증 결과(성공/실패) 확인

### 3. 새로운 Proof 생성
1. "새로운 Proof 생성" 메뉴 클릭
2. State Channel의 마지막 상태 파일 업로드
3. 토큰 전송 정보 입력:
   - 수신자 주소 (To Address)
   - 전송 금액 (Amount)
4. "Proof 생성 실행" 버튼 클릭
5. 생성 완료 후 결과 ZIP 파일 다운로드
6. 다운로드한 파일을 브라우저에서 업로드하여 제출

## 기술 스택

- **Electron**: 크로스 플랫폼 데스크톱 애플리케이션
- **React**: UI 프레임워크
- **TypeScript**: 타입 안전성
- **Tailwind CSS**: 스타일링
- **Vite**: 빌드 도구
- **react-router-dom**: 라우팅

## 라이선스

MIT

## 작성자

Tokamak Network

