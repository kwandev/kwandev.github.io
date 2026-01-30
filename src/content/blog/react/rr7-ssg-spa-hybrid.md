---
title: React Router 7로 SSG + SPA 하이브리드 구현하기 (서버 없이 정적 사이트로만 운영하기)
description: SSG + SPA 조합을 이용해 서버없이 서비스 소개 페이지를 구현해보자
date: 2026-02-01
tags:
  - React
  - React Router
  - Remix
  - SPA
  - SSG
---

## 들어가며

서비스 소개 페이지를 만들 때 고민이 생겼습니다. 메인 페이지와 회사 소개 같은 정적 페이지는 SEO도 중요하고 빠른 로딩이 필요한데, 나머지 페이지들은 그냥 SPA로 동작해도 괜찮았거든요. 하지만 서버를 운영하기엔 비용 부담이 있었고, 정적 호스팅만으로 해결하고 싶었습니다.

결론부터 말하면, React Router 7의 `ssr: false` + `prerender` 조합으로 이 문제를 해결했습니다. 일부 페이지는 빌드 타임에 미리 렌더링(SSG)하고, 나머지는 SPA로 동작하는 하이브리드 방식입니다.

이 글에서는 제가 경험한 시행착오와 해결 과정, 그리고 추가로 발견한 SEO 팁까지 공유하겠습니다.

## 목표: 서버 없는 정적 호스팅

제가 원했던 것

- `/`, `/about` 같은 주요 페이지는 SSG로 빌드 타임에 HTML 생성 (SEO를 위해)
- 나머지 페이지는 SPA로 동작
- 서버 없이 정적 파일만으로 운영 (비용 절감을 위해)

React Router 7은 이런 요구사항을 정확히 충족시킬 수 있는 기능을 제공합니다.

## 설정: ssr: false + prerender

가장 핵심이 되는 설정은 `react-router.config.ts`입니다:

```typescript
// react-router.config.ts
import type { Config } from "@react-router/dev/config";

export default {
  // SSR 비활성화 = 서버 필요 없음
  ssr: false,
  // 특정 경로만 미리 렌더링
  prerender: ["/", "/about"],
} satisfies Config;
```

이 설정이 의미하는 것:

- `ssr: false`: 런타임 서버 렌더링을 비활성화합니다. 동적 렌더링을 위한 서버가 필요 없습니다.
- `prerender: ["/", "/about"]`: 빌드 타임에 이 경로들을 미리 HTML로 렌더링합니다.

## 문제 발생: 빈 페이지가 렌더링되다

처음 설정하고 빌드했을 때, 이상한 현상이 발생했습니다.

```bash
npm run build
```

빌드는 성공했고, `build/client/index.html`과 `build/client/about/index.html` 파일도 생성됐습니다. 하지만 파일을 열어보니 내용이 비어있었습니다. `HydrateFallback`의 "Loading..." 메시지만 있고, 실제 컨텐츠는 없었어요.

```html
<!-- 생성된 index.html -->
<!DOCTYPE html>
<html>
  <head>
    ...
  </head>
  <body>
    <div id="root">Loading...</div>
    <script src="/assets/entry.client.js"></script>
  </body>
</html>
```

제가 아는 정적 렌더링(SSG)은 이런게 아닌데 말이죠...
HeroSection, 소개 문구, 이미지... 모든 컨텐츠가 빠져있었습니다.

## 원인: loader가 없으면 prerender를 건너뛴다

공식 문서와 AI 대화 핑퐁을 통해 원인을 찾았습니다. React Router 7의 prerendering은 **loader의 존재 여부로 페이지를 렌더링할지 결정**합니다.

### loader가 없다면?

```tsx
// app/pages/home/index.tsx
export default function HomePage() {
  return (
    <div>
      <h1>Welcome!</h1>
      <p>This is our homepage</p>
    </div>
  );
}
```

이 코드로 빌드하면 React Router는 이렇게 판단합니다.

> 이 페이지는 서버(빌드 타임)에서 가져올 데이터가 없네? 그럼 굳이 미리 렌더링하지 않고, 브라우저에서 JavaScript가 실행될 때 렌더링하면 되겠다.

결과적으로 빌드 시점에는 `HydrateFallback`만 렌더링되고, 실제 컨텐츠는 빌드 결과물 html에 포함되지 않았던 것입니다.

### loader를 추가하면?

```tsx
// app/pages/home/index.tsx

// 빈 loader라도 추가
export function loader() {}

export default function HomePage() {
  return (
    <div>
      <h1>Welcome!</h1>
      <p>This is our homepage</p>
    </div>
  );
}
```

이제 React Router는 다르게 반응합니다.

> loader가 있네? 이 페이지는 서버(빌드 타임)에서 실행되어야 하는 로직이 있구나. 빌드 시점에 렌더링해서 HTML에 포함시키자.

빌드 결과:

```html
<!-- 생성된 index.html -->
<!DOCTYPE html>
<html>
  <head>
    ...
  </head>
  <body>
    <div id="root">
      <div>
        <h1>Welcome!</h1>
        <p>This is our homepage</p>
      </div>
    </div>
    <script src="/assets/entry.client.js"></script>
  </body>
</html>
```

드디어 실제 컨텐츠가 HTML에 포함됩니다. 휴..

## 해결책은 빈 loader라도 추가해주기

prerender하고 싶은 모든 페이지에 loader를 추가했습니다. 데이터가 필요 없어도 빈 함수로라도 추가해야 합니다.

```tsx
// app/pages/home/index.tsx
export function loader() {}

export default function HomePage() {
  return (
    <div>
      <HeroSection />
      <Features />
      <CallToAction />
    </div>
  );
}
```

```tsx
// app/pages/about/index.tsx
export function loader() {}

export default function AboutPage() {
  return (
    <div>
      <h1>About Us</h1>
      <CompanyHistory />
      <TeamMembers />
    </div>
  );
}
```

이제 빌드하면

```bash
> react-router build

Prerender: Generated build/client/index.html
Prerender: Generated build/client/index.data
Prerender: Generated build/client/about/index.html
Prerender: Generated build/client/about/index.data
Prerender: Generated build/client/__spa-fallback.html
```

완벽합니다! 각 페이지마다:

- `index.html`: 초기 문서 요청을 위한 완전한 HTML
- `index.data`: 클라이언트 네비게이션을 위한 데이터 파일
- `__spa-fallback.html`: prerender되지 않은 경로를 위한 SPA fallback (403, 404 에러 fallback로 사용)

## 최종적으로 기대되는 동작 정리

### 빌드 타임

1. React Router는 `prerender` 배열의 각 경로를 확인합니다
2. 각 경로에 매칭되는 route들을 찾습니다
3. **loader가 있는 route들을 빌드 시점에 실행**합니다
4. 실행 결과를 바탕으로 컴포넌트를 렌더링하여 HTML을 생성합니다
5. HTML과 데이터 파일을 `build/client`에 저장합니다

### 런타임 (브라우저)

**prerender된 페이지 접근 시 (`/`, `/about`):**

1. 서버(정적 호스팅)가 `index.html`을 반환
2. HTML에 이미 컨텐츠가 포함되어 있어 즉시 표시됨
3. JavaScript가 로드되면 hydration 진행
4. 이후 클라이언트 라우팅으로 동작

**prerender되지 않은 페이지 접근 시 (`/contact`, `/pricing` 등):**

1. 서버가 404, 403 등을 반환하지만 `__spa-fallback.html`로 리다이렉트
2. SPA fallback HTML이 로드됨 (기본 shell만 포함)
3. JavaScript가 실행되고 브라우저에서 페이지 렌더링
4. SPA로 동작

## 정적 호스팅 설정: 404 처리

prerender되지 않은 경로에 대한 404 처리가 중요합니다. 대부분의 정적 호스팅 서비스는 설정 파일로 이를 지원합니다.

AWS S3 + CloudFront 조합이라면 설정에 따라 403 에러가 발생할 수 있습니다.

### Netlify (\_redirects)

```
# / 경로를 prerender하지 않은 경우
/*    /index.html   200

# / 경로를 prerender한 경우
/*    /__spa-fallback.html   200
```

### Vercel (vercel.json)

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/__spa-fallback.html"
    }
  ]
}
```

### Cloudflare Pages (\_redirects)

```
/*    /__spa-fallback.html   200
```

이 설정이 없으면 `/contact` 같은 경로에 직접 접근했을 때 404 에러가 발생합니다.

## SEO 보너스: Canonical Tag로 중복 URL 통합하기

정적 사이트를 운영하다 보면 `/about`과 `/about/` 같은 trailing slash 문제를 만납니다. 이 둘은 기술적으로 다른 URL이지만, 같은 페이지를 가리킵니다.

문제는 분석 도구 서비스(GA, Mixpanel 등)에 따라 이 둘을 별개로 집계할 가능성이 있다는 점입니다. 데이터가 분산되고, SEO 측면에서도 좋지 않죠.

### 해결책: Canonical Tag

#### 1. React 19의 내장 `<link>` 컴포넌트를 사용해서 canonical URL을 명시

```tsx
// app/pages/about/index.tsx
export function loader() {}

export default function AboutPage() {
  return (
    <div>
      {/* Canonical tag로 정규 URL 명시 */}
      <link rel="canonical" href="https://yourdomain.com/about" />

      <h1>About Us</h1>
      <p>We are a great company...</p>
    </div>
  );
}
```

#### 2. 글로벌 적용

```tsx
// app/root.tsx
export function Layout({ children }: { children: React.ReactNode }) {
  const canonicalUrl = useCanonical();

  ...
}

// app/shared/hooks/use-canonical.tsx
import { useLocation } from "react-router";

export const useCanonical = () => {
  const location = useLocation();
  const origin = import.meta.env.VITE_SITE_URL;
  const canonicalPath = location.pathname.replace(/\/+$/, "");
  const canonicalUrl = `${origin}${canonicalPath}`;
  return canonicalUrl;
};

```

이제 사용자가 `/about` 또는 `/about/` 어느 쪽으로 접근하더라도, 검색 엔진과 분석 툴은 `https://yourdomain.com/about`을 정규 URL로 인식합니다.

## 장점과 주의사항

### 장점

1. **비용 절감**: 서버 없이 정적 호스팅만으로 운영 (Cloudflare Pages, Netlify, AWS S3 + CloudFront 등 활용)
2. **빠른 로딩**: 주요 페이지는 미리 렌더링되어 있어 즉시 표시
3. **SEO 최적화**: prerender된 페이지는 검색 엔진이 완전한 HTML을 크롤링 가능
4. **유연성**: 필요한 페이지만 선택적으로 SSG 적용
5. **간단한 배포**: `build/client` 폴더만 업로드하면 끝

### 주의사항

1. **loader 필수**: prerender하고 싶은 모든 페이지에 loader 추가 (빈 함수라도)
2. **빌드 타임 증가**: prerender할 페이지가 많을수록 빌드 시간 증가
3. **동적 데이터 제한**: 빌드 타임에 결정되므로 실시간 데이터는 클라이언트에서 fetch 필요
4. **404 설정 필수**: 호스팅 서비스의 fallback 설정 반드시 필요
5. **서버 함수 활용 금지**: `ssr: false`일 때는 prerender가 아닌 페이지에서 서버 함수 사용 불가

## 언제 이 패턴을 사용할까?

**이 패턴이 적합한 경우**

- 마케팅 사이트 + 웹 앱 하이브리드
- 일부 페이지만 SEO가 중요한 경우
- 서버 운영을 안하고 싶은 경우
- 정적 호스팅의 장점(CDN, 캐싱 등)을 활용하고 싶은 경우

**대안을 고려해야 하는 경우**

- 모든 페이지가 실시간 데이터에 의존하는 경우
- 페이지가 수백~수천 개인 경우 (빌드 시간 문제)
- 사용자 인증이 필요한 페이지가 대부분인 경우

## 마치며

React Router 7의 `ssr: false` + `prerender` 조합은 강력한 패턴입니다. 서버 없이도 SEO와 성능을 모두 잡을 수 있고, 필요한 곳에만 SSG를 적용할 수 있는 유연성을 제공합니다.

처음에는 "왜 prerender가 안 되지?"라며 삽질했지만, loader의 역할을 이해하고 나니 모든 게 명확해졌습니다. 빈 loader 하나로 빌드 시스템에게 "이 페이지는 미리 렌더링해줘" 라고 신호를 보내는 것이죠.

여기에 canonical tag까지 추가하면 SEO와 분석 데이터까지 깔끔하게 정리할 수 있습니다.

이 패턴을 활용해보세요. 특히 서비스 소개 페이지나 마케팅 사이트를 만들 때 유용합니다

---

## 참고 자료

- [React Router 7 - Pre-Rendering](https://reactrouter.com/how-to/pre-rendering)
- [React Router 7 - SPA Mode](https://reactrouter.com/how-to/spa)
- [React 19 - <link> Component](https://react.dev/reference/react-dom/components/link)
