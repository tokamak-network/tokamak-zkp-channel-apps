# Tokamak ZKP Channel Apps

Tokamak Network의 ZK-EVM 기반 State Channel 애플리케이션 모음입니다.

## 📦 패키지 구조

### `zkp-channel-verifier`
Intermediate Proof 검증 및 State Channel 기반 새로운 Proof 생성을 위한 Electron 데스크톱 애플리케이션입니다.

**주요 기능:**
- 🔍 **Intermediate Proof 검증**: Proof 파일과 EVM State 파일을 업로드하여 검증
- ⚡ **새로운 Proof 생성**: State Channel의 마지막 상태 기반 새 Proof 생성
- 📦 **결과 다운로드**: 생성된 Proof를 ZIP 파일로 다운로드

[상세 문서 보기](./packages/zkp-channel-verifier/README.md)

## 🚀 빠른 시작

### 설치

```bash
# 리포지토리 클론
git clone https://github.com/tokamak-network/tokamak-zkp-channel-apps.git
cd tokamak-zkp-channel-apps

# zkp-channel-verifier 설치
cd packages/zkp-channel-verifier
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

## 🛠️ 기술 스택

- **Electron**: 크로스 플랫폼 데스크톱 애플리케이션
- **React**: UI 프레임워크
- **TypeScript**: 타입 안전성
- **Tailwind CSS**: 스타일링
- **Vite**: 빌드 도구
- **tokamak-zk-evm**: ZK-EVM 바이너리

## 📝 라이선스

MIT

## 👥 기여

Tokamak Network

## 🔗 관련 프로젝트

- [Tokamak-zk-EVM](https://github.com/tokamak-network/Tokamak-zk-EVM)
- [Tokamak-zk-EVM-playgrounds](https://github.com/tokamak-network/Tokamak-zk-EVM-playgrounds)
