---
title: 웹사이트 Favicon, 이제는 최소한으로 준비하세요
description: favicon을 만드느라 불필요한 이미지를 20개씩 만들 필요가 없습니다.
date: 2025-12-20
tags:
  - Web
  - favicon
---

웹 개발을 하다 보면 누구나 한 번쯤 favicon 때문에 귀찮았던 경험이 있을 것입니다.

다양한 디바이스와 브라우저를 지원하기 위해 20개가 넘는 PNG 파일을 생성하고, 복잡한 피그마 플러그인을 설치해 사용해보고, 온라인에서 'favicon generator'를 검색해가며 "이게 이렇게까지 해야할 일인가?" 하는 경험 말이죠.

GeekNews를 읽던 어느날 한 아티클을 읽고, 그동안 제가 했던 작업들이 얼마나 비효율적이었는지 깨달았습니다. 2025년 현재, 우리는 훨씬 더 간단한 방법으로 대부분의 환경을 커버할 수 있습니다.

## 핵심 요약: 5개 파일로 끝내기

복잡한 설정은 이제 필요 없어요. 다음 5개 파일만 있으면 됩니다.

- favicon.ico (32×32) - 레거시 브라우저용
- icon.svg - 현대 브라우저용 (라이트/다크 모드 대응)
- apple-touch-icon.png (180×180) - iOS 기기용
- icon-192.png (192×192) - Android 홈 스크린용
- icon-512.png (512×512) - Android 스플래시 스크린용

추가로 PWA를 지원한다면 manifest.webmanifest 파일과 maskable 아이콘(512×512)이 필요합니다.

## HTML 설정

### 기본 설정

```html
<head>
  <link rel="icon" href="/favicon.ico" sizes="32x32" />
  <link rel="icon" href="/icon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
</head>
```

### PWA 지원 시 추가

```html
<link rel="manifest" href="/manifest.webmanifest" />
```

**manifest.webmanifest 파일 예시**

```json
{
  "name": "My Website",
  "icons": [
    {
      "src": "/icon-192.png",
      "type": "image/png",
      "sizes": "192x192"
    },
    {
      "src": "/icon-mask.png",
      "type": "image/png",
      "sizes": "512x512",
      "purpose": "maskable"
    },
    {
      "src": "/icon-512.png",
      "type": "image/png",
      "sizes": "512x512"
    }
  ]
}
```

## 왜 이렇게 간단해졌을까?

### 1. SVG의 힘

SVG는 벡터 포맷이기 때문에 확대/축소가 자유롭습니다. 2025년 현재 72% 이상의 브라우저가 SVG favicon을 지원하며, 하나의 SVG 파일로 여러 해상도를 커버할 수 있습니다.
더 놀라운 점은 SVG 내부에 CSS를 넣어 라이트/다크 모드를 자동으로 지원할 수 있다는 것입니다.

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500">
  <style>
    @media (prefers-color-scheme: dark) {
      .icon-fill { fill: #f0f0f0 }
    }
  </style>
  <path class="icon-fill" fill="#0f0f0f" d="..." />
</svg>
```

### 2. 브라우저의 발전

과거에 필요했던 많은 포맷들이 이제는 불필요해졌습니다.

- Windows Tile Icon: Edge의 최신 버전에서는 더 이상 필요 없음
- Safari Pinned Icon: Safari 12부터 일반 favicon 사용
- rel="shortcut": 표준이 아니었고, rel="icon"만으로 충분

## 자동화 도구

그럼 어떻게 해야 저 파일들을 간단히 만들수 있을까요?

먼저 SVG파일을 준비하고 svgo, Inkscape, Squoosh, UPNG.js 등 다양한 플러그인, 서비스등을 이용해 이미지를 준비할 수 있습니다.

하지만 그것도 귀찮아요. 다행히 저와 같은 글을 보시고 [간단히 서비스를 만들어주신 분](https://news.hada.io/topic?id=19208)이 계십니다.

AI와 함께 간단히 만드셨다고 하더라고요. 감사히 잘 쓰고 있습니다.
사라지면 제가 AI를 이용해서 만들어봐도 좋겠네요. 늘 이런걸 만들어서 사용할 생각을 하는게 개발자라는 직업이 아닐까 생각합니다.

## 마무리

복잡했던 favicon 설정이 이제는 5개 파일과 몇 줄의 HTML로 해결됩니다. 20개가 넘는 파일을 관리하던 시절과 비교하면 엄청난 발전이죠.

- ✅ 파일 수 최소화 (5개)
- ✅ 현대 브라우저 완벽 지원
- ✅ 레거시 브라우저 호환
- ✅ 라이트/다크 모드 자동 대응
- ✅ PWA 지원
- ✅ 쉽고 빠르게 생성, 적용 가능

더 이상 복잡한 favicon 제너레이터나 피그마 플러그인 등에 의존할 필요가 없습니다. 이제 필요한 것만 딱 준비하고, 진짜 중요한 개발에 집중합시다.

자세한 내용은 원문을 참고해주세요.

### 참고자료

- [How to Favicon in 2025: Three files that fit most needs](https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs)
- [2025년에 Favicon을 준비하는 법](https://news.hada.io/topic?id=19204)
- [2025년에 Favicon 자동 생성하기](https://dev-huiya.github.io/favicon-generator/)
