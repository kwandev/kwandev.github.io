---
title: 외부 도메인에 내 사이트를 연결하는 법 - CloudFront + 외부회사 협업하기
description: 외부회사의 도메인을 우리 서비스에 연결하거나, 업체를 교체할 때 겪게 되는 실전 경험을 정리했습니다.
date: 2026-04-01
tags:
  - AWS
  - Web
  - 협업
---

## 들어가며

"외부회사의 도메인을 우리 인프라에 연결해달라"는 요구사항이 생겼습니다. 예를 들어 A회사가 소유한 `chat.example.com` 도메인을 우리 회사의 AWS CloudFront에 연결해야 하는 상황입니다.

다시 말하면, 우리 서비스를 A회사의 도메인을 통해 제공하는 것이죠.

단순히 기술적인 설정만 하면 될 것 같지만, 실제로는 **외부회사와의 커뮤니케이션**이 절반 이상을 차지합니다. 이 글에서는 두 가지 실전 시나리오를 다룹니다.

- **시나리오 1**: 외부 도메인을 우리 CloudFront에 처음 연결하기
- **시나리오 2**: 운영사가 바뀌어 CloudFront 배포를 교체하기

---

## 시나리오 1: 외부 도메인을 우리 CloudFront에 연결하기

### 상황

- `chat.example.com`은 외부회사(A사)가 소유한 도메인
- 우리 회사는 S3 + CloudFront로 서비스를 운영 중
- A사가 자사 도메인으로 우리 서비스에 접근하게 하고 싶음

### 외부회사에서 보내준 것

A사에서 "도메인 등록 완료"라며 인증서 파일 묶음을 보내왔습니다.

```
STAR.example.com.crt    ← 인증서 본문
STAR.example.com.key    ← 개인키
ca-bundle.crt           ← 인증서 체인
STAR.example.com.pem    ← 위와 동일 내용 (확장자만 다름)
STAR.example.com.pfx    ← Windows/IIS용
STAR.example.com.keystore ← Java용
```

파일이 많아 당황스럽지만, **실제로 필요한 건 3개**뿐입니다.

### 작업 순서

#### 1단계: ACM에 인증서 Import (우리 회사)

CloudFront에서 커스텀 도메인을 사용하려면 **반드시 us-east-1(버지니아 북부) 리전**의 ACM에 인증서가 있어야 합니다.

AWS 콘솔에서:

- 리전을 **us-east-1**로 변경
- ACM(Certificate Manager) → **인증서 가져오기(Import)**
- 인증서 본문: `.crt` 파일 내용
- 프라이빗 키: `.key` 파일 내용
- 인증서 체인: `ca-bundle.crt` 파일 내용

CLI로 하면:

```bash
aws acm import-certificate \
  --region us-east-1 \
  --certificate fileb://STAR.example.com.crt \
  --private-key fileb://STAR.example.com.key \
  --certificate-chain fileb://ca-bundle.crt
```

#### 2단계: CloudFront 배포 설정 (우리 회사)

CloudFront 배포 편집에서:

- **대체 도메인 이름(CNAMEs)**: `chat.example.com` 추가
- **사용자 정의 SSL 인증서**: 1단계에서 import한 인증서 선택

#### 3단계: DNS 변경 요청 (외부회사에 요청)

여기가 **외부회사와의 소통이 필요한 지점**입니다.

A사에 "DNS 레코드를 CNAME으로 변경해주세요"라고 요청합니다.

```
chat.example.com → CNAME → d1234abcdef.cloudfront.net
```

이때 주의할 점이 있습니다.

- 기존에 **A 레코드 (IP 주소)** 설정되어 있다면 반드시 **CNAME으로 변경**해야 합니다
- CloudFront는 고정 IP가 아니기 때문에 A 레코드로는 연결할 수 없습니다
- `dig` 명령어로 확인했을 때 `IN A xxx.xxx.xxx.xxx` 형태가 나오면 아직 변경 전입니다

### 놓치기 쉬운 포인트: 인증서 갱신

외부에서 받아 import한 인증서는 **자동 갱신이 되지 않습니다.**

| 구분      | ACM 직접 발급   | 외부 인증서 Import                |
| --------- | --------------- | --------------------------------- |
| 자동 갱신 | AWS가 자동 처리 | 수동 갱신 필요                    |
| 비용      | 무료            | 인증서 구매 비용 별도             |
| 갱신 주체 | AWS             | 외부회사에서 재발급 → 다시 import |

만료일 전에 외부회사로부터 갱신 인증서를 받아 다시 import 해야 합니다. **EventBridge + SNS** 알림을 걸어두는 것을 권장합니다.

---

## 시나리오 2: 운영사 교체 — CloudFront 배포를 바꿔야 할 때

### 상황

- A회사의 도메인 `chat.example.com`이 B회사의 CloudFront에 연결되어 운영 중
- 계약 만료로 C회사의 CloudFront로 교체해야 함 (B → C)
- C회사가 미리 자사 CloudFront에 도메인을 등록하려 했더니...

### 만나게 되는 에러

```
One or more aliases specified for the distribution includes an
incorrectly configured DNS record that points to another CloudFront
distribution.
```

**AWS CloudFront는 동일한 CNAME을 두 개의 배포에 동시에 등록할 수 없습니다.** B회사 배포에 `chat.example.com`이 남아있는 한, C회사는 같은 도메인을 등록할 수 없습니다.

### 왜 이런 제약이 있을까?

CloudFront가 CNAME 등록 시 다음과 같은 검증을 수행하기 때문입니다.

1. `chat.example.com`의 DNS를 조회
2. 이미 다른 CloudFront 배포를 가리키고 있는지 확인
3. 다른 배포를 가리키고 있으면 → 등록 거부

한 도메인이 동시에 두 CDN을 가리키는 충돌을 방지하기 위한 정책입니다.

### 교체 작업 순서

이 작업은 **세 주체가 순서대로 움직여야** 합니다.

```
[B회사] CloudFront에서 CNAME 삭제
         ↓
[A회사] DNS 레코드 삭제 또는 C회사 CloudFront로 변경
         ↓
[C회사] 자사 CloudFront에 CNAME 등록
```

이 순서가 지켜지지 않으면 에러가 계속됩니다. 그리고 **삭제~재등록 사이에 짧은 다운타임**이 발생할 수 있으므로, 세 회사가 동시에 대기하며 순차적으로 진행하는 것이 이상적입니다.

### 삭제했는데 여전히 반영이 안 되는 경우

#### DNS 캐싱 때문일 수 있습니다

`dig` 결과의 TTL 값만큼 캐시가 유지됩니다. 보통 **수 분 ~ 수 시간** 이내에 반영되지만, 2~3시간이 지나도 그대로라면 **캐싱이 아니라 설정 문제를 의심**해야 합니다.

#### 설정 문제 확인 방법

**권한 있는 네임서버에 직접 질의**하면 캐시와 무관하게 실제 상태를 볼 수 있습니다.

```bash
# 네임서버 확인
dig example.com NS

# 해당 네임서버에 직접 질의
dig @ns1.example.com chat.example.com

# 또는 루트부터 추적
dig chat.example.com +trace

# 외부 DNS로 교차 확인
dig @8.8.8.8 chat.example.com
```

여기서 여전히 이전 CNAME이 나온다면, 실제로 삭제가 되지 않은 것입니다.

#### 흔한 실수들

- **Route 53에 호스팅 영역이 여러 개**: 실제 사용 중이 아닌 영역에서 삭제한 경우
- **서브도메인이 별도 위임**: `chat.example.com`이 다른 DNS 서비스에서 관리되고 있는 경우
- **삭제 후 저장 미완료**: 콘솔에서 삭제만 하고 "변경 사항 저장"을 누르지 않은 경우

### B회사가 협조하지 않는 경우

드물지만 계약이 종료되었음에도 B회사가 CNAME을 삭제해주지 않는 상황이 있을 수 있습니다. 이 경우 **A회사(도메인 소유자)** 가 AWS Support에 직접 요청할 수 있습니다. AWS가 DNS TXT 레코드 등을 통해 도메인 소유권을 검증한 뒤 충돌을 해소해 줍니다.

---

## 협업 시 체크리스트

외부회사와 도메인 연결 작업을 할 때, 사전에 정리해두면 좋은 항목들입니다.

| 확인 항목                   | 설명                                                             |
| --------------------------- | ---------------------------------------------------------------- |
| 인증서 파일 수령            | `.crt`, `.key`, `ca-bundle.crt` 3개가 핵심                       |
| 인증서 만료일 확인          | import 인증서는 자동 갱신 안 됨, 만료일 캘린더 등록              |
| DNS 변경 권한 확인          | 누가 DNS를 관리하는지, CNAME 변경이 가능한지                     |
| CloudFront 도메인 공유      | `d1234abcdef.cloudfront.net` 형태의 CNAME 주소를 외부회사에 전달 |
| 작업 시점 조율              | 업체 교체 시 삭제 → 재등록 순서와 타이밍 사전 합의               |
| 롤백 계획                   | 문제 발생 시 원래 설정으로 되돌리는 절차                         |
| dig 명령어로 사전/사후 확인 | 작업 전후로 DNS 상태를 직접 검증                                 |

---

## 마치며

외부 도메인 연결은 기술적으로는 어렵지 않지만, **"누가 무엇을 먼저 해야 하는가"**라는 순서가 핵심입니다. 특히 업체 교체 상황에서는 세 회사의 작업 순서가 어긋나면 다운타임이 길어지거나 에러가 해결되지 않습니다.

작업 전에 관련 담당자들과 순서를 명확히 공유하고, `dig` 명령어로 각 단계의 결과를 검증하면서 진행하는 것을 추천합니다.
