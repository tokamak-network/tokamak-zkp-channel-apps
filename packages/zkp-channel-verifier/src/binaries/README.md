# Binaries Directory

이 디렉토리에는 tokamak-zk-evm 바이너리 파일들이 위치합니다.

## 구조

기존 playground-hub의 binaries 구조를 참고하여 다음과 같은 구조로 구성됩니다:

```
binaries/
├── bin/                    # 실행 바이너리 파일들
│   ├── verify             # Proof 검증 바이너리
│   ├── prove              # Proof 생성 바이너리
│   └── ...
├── resource/              # 리소스 파일들
│   ├── qap-compiler/
│   │   └── library/
│   └── setup/
│       └── output/
└── *.sh                   # 실행 스크립트들
```

## 필요한 바이너리

1. **verify**: Intermediate Proof 검증을 위한 바이너리
2. **prove**: 새로운 Proof 생성을 위한 바이너리
3. 관련 라이브러리 파일들 (ICICLE 등)

## 설치 방법

playground-hub의 binaries 디렉토리에서 필요한 파일들을 복사하거나,
Tokamak-zk-EVM 프로젝트를 빌드하여 바이너리를 생성합니다.

