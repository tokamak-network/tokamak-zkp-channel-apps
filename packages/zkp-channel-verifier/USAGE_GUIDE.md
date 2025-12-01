# ZKP Channel Verifier - Usage Guide

## 🎯 **state_snapshot.json 업로드로 Proof 생성하기**

이제 `state_snapshot.json` 파일만 업로드하면 자동으로 proof를 생성할 수 있습니다!

## 📋 **사전 준비**

### 1. 의존성 설치

```bash
cd ~/Desktop/dev/tokamak-zkp-channel-apps/packages/zkp-channel-verifier
npm install
```

### 2. dist 동기화

```bash
./sync-dist.sh
```

## 🚀 **사용 방법**

### Step 1: 앱 실행

```bash
npm start
```

### Step 2: Generate Proof 페이지로 이동

메인 메뉴에서 **"Generate Proof"** 클릭

### Step 3: 필수 정보 입력

#### 1️⃣ **Channel ID 입력**
```
Channel ID: [2]  ← 온체인 채널 ID
```

#### 2️⃣ **[Refresh Data] 클릭**
- 온체인에서 참가자 목록과 토큰 정보를 자동으로 가져옵니다

#### 3️⃣ **State File 업로드**
```
[Upload State File] 클릭
```

`state_snapshot.json` 선택 - 다음과 같은 구조:

```json
{
  "stateRoot": "0x1234...",
  "storageEntries": [
    {
      "index": 0,
      "key": "0xabcd...",
      "value": "0x64..." 
    }
  ],
  "registeredKeys": ["0xabcd..."],
  "contractAddress": "0xa30fe...",
  "userL2Addresses": ["0x5678...", "0x9abc..."],
  "userStorageSlots": ["0"],
  "timestamp": 1234567890,
  "userNonces": ["0", "0", "0"]
}
```

#### 4️⃣ **Recipient 선택**
```
Select: [Participant 2] ▼
```
또는 Manual로 직접 입력

#### 5️⃣ **Token 선택**
```
[ETH] [WTON] [USDT]
```

#### 6️⃣ **Amount 입력**
```
⚠️  Enter amount in smallest unit:
- WTON: ray (1 WTON = 10^27 ray)
- ETH: wei (1 ETH = 10^18 wei)

예시:
50 WTON = 50000000000000000000000000000
1 ETH = 1000000000000000000
```

#### 7️⃣ **[Generate Proof] 클릭**

## 📊 **실행 과정**

버튼을 클릭하면 다음 과정이 자동으로 진행됩니다:

```
🚀 Starting proof generation...
📁 State file: state_snapshot.json
💳 Recipient: 0xF9Fa...
💰 Amount: 50000000000000000000000000000 WTON

ℹ️  Generating circuit...
[Synthesizer] Creating synthesizer...
[Synthesizer] Restoring previous state...
[Synthesizer] ✅ Previous state restored: 0x1234...
[Synthesizer] Executing transaction...
[Synthesizer] ✅ Circuit generated successfully
[Synthesizer] - Placements: 1234
[Synthesizer] - State root: 0x5678...

ℹ️  Running preprocess...
[Prover] Preprocess initialization...
[Prover] ✅ Preprocess completed

ℹ️  Generating proof...
[Prover] Prover initialization...
[Prover] Running prove0...
[Prover] Running prove1...
[Prover] Running prove2...
[Prover] Running prove3...
[Prover] Running prove4...
[Prover] Total proving time: 15.234 seconds
[Prover] ✅ Proof generated successfully

ℹ️  Verifying proof...
[Verifier] Verifier initialization...
[Verifier] true
[Verifier] ✅ Verification PASSED

✅ Proof generation completed!
✅ Verification PASSED!
📄 New state root: 0x9abc...
📦 Compressing result files...
✅ Compression complete! File is ready for download.
```

## 📥 **결과 다운로드**

완료되면 **[Download Proof Files (ZIP)]** 버튼이 활성화됩니다.

다운로드된 ZIP 파일에는 다음이 포함됩니다:
- `instance.json` - Public inputs
- `placementVariables.json` - Circuit placements
- `permutation.json` - Wire permutations
- `proof.json` - ZK proof
- `state_snapshot.json` - 새로운 상태 (다음 트랜잭션용)

## 🔄 **다음 Proof 생성**

이전 proof 생성 시 저장된 새로운 `state_snapshot.json`을 다시 업로드하면 됩니다:

```
Proof #1: state_initial.json → (Alice sends 50) → state_1.json
                                                     ↓
Proof #2: state_1.json → (Bob sends 25) → state_2.json
                                            ↓
Proof #3: state_2.json → (Charlie sends 15) → state_3.json
```

## 💡 **Tips**

### State File 준비하기

첫 번째 state file이 없다면 Tokamak-zk-EVM에서 생성:

```bash
cd ~/Desktop/dev/Tokamak-zk-EVM/packages/frontend/synthesizer
npx tsx examples/L2StateChannel/onchain-channel-simulation.ts
```

생성된 파일:
```
test-outputs/onchain-proof-1/state_snapshot.json
```

### 온체인 Channel 정보 확인

Etherscan에서 확인:
- RollupBridge Proxy: `0x780ad1b236390C42479b62F066F5cEeAa4c77ad6`
- Channel ID: `getChannelInfo(channelId)` 호출

### Amount 계산 예시

```javascript
// WTON (ray: 10^27)
50 WTON = 50 * 10^27 = "50000000000000000000000000000"

// ETH (wei: 10^18)  
1 ETH = 1 * 10^18 = "1000000000000000000"

// parseEther/parseRay 사용
import { parseEther } from 'ethers';
parseEther('50').toString(); // "50000000000000000000"
```

## 🐛 **문제 해결**

### "instance.json not found"
- dist 동기화: `./sync-dist.sh`
- Setup 파일 확인: `src/binaries/resource/setup/output/`

### "ICICLE library not found"
- `src/binaries/backend-lib/icicle/lib/` 확인
- dist 재동기화

### "State root mismatch"
- `previousStateJson`이 올바른지 확인
- Channel ID와 참가자 정보가 일치하는지 확인

### "Synthesis failed"
- RPC URL이 작동하는지 확인
- Contract address가 올바른지 확인
- 개발자 도구 Console에서 에러 로그 확인

## 🎉 **완료!**

이제 state_snapshot.json만 업로드하면 자동으로:
1. 이전 상태 복원 ✅
2. 새로운 트랜잭션 생성 ✅
3. Circuit 생성 ✅
4. Proof 생성 ✅
5. Verification ✅
6. 새로운 상태 저장 ✅

모든 과정이 UI에서 한 번에 실행됩니다! 🚀

