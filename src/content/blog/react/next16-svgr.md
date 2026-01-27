---
title: Next.js 16 Turbopack에서 SVG 사용하기
description: Next.js 16 Turbopack에서 SVGR을 사용할 때 어떻게 해야하는 지 알아봅니다
date: 2025-11-21
tags: 
  - Next.js
  - React
  - SVG
---

## Next.js 16 Turbopack에서 SVG를 React 컴포넌트로 사용하기

Next.js 16에서는 <a href="https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack#:~:text=Good%20to%20know,removed%20in%20Next.js%2016." target="_blank">`experimental.turbo` 옵션이 제거</a>되어 기본값이 됐습니다.
이런 환경에서 SVG를 사용할 때 어떻게 해야하는지 알아보겠습니다.

Next.js 프로젝트에서 SVG 아이콘을 관리하는 방법은 여러 가지가 있습니다. 가장 일반적인 방법은 `img` 태그로 사용하거나 `react-icons`, `lucide` 같은 라이브러리를 사용하는 것이지만, 이 방법들은 각각의 단점이 있습니다.

- `img` 태그: CSS로 색상 변경이 어렵고, 매번 네트워크 요청이 필요할 수 있습니다.
- 아이콘 라이브러리: 커스텀 디자인 시스템의 아이콘을 사용하기 어렵습니다.

이번 글에서는 Next.js 의 **Turbopack**과 <a href="https://react-svgr.com/docs/getting-started" target="_blank">**@svgr/webpack**</a>을 사용하여 SVG 파일을 React 컴포넌트로 변환하고, TypeScript의 타입 시스템을 활용한 타입 안전한 아이콘 관리 시스템을 구축하는 방법을 소개합니다.

---

## 문제 상황

Next.js 16부터 기본 번들러가 Turbopack으로 변경되었습니다. Turbopack에서 SVG를 React 컴포넌트로 사용하려고 하면 다음과 같은 에러가 발생합니다.

```
Failed to parse svg source code for image dimensions

Caused by:
- Source code does not contain a <svg> root element
```

이는 Turbopack이 SVG 파일을 제대로 처리하지 못해서 발생하는 문제입니다.

---

## Step 1: next.config.ts 설정

### @svgr/webpack 설치

먼저 필요한 패키지를 설치합니다:

```bash
npm install -D @svgr/webpack
```

### Turbopack 설정

Next.js 공식 문서에 따르면, Turbopack에서 Webpack 로더를 사용하려면 **`as: '*.js'`** 옵션을 반드시 추가해야 합니다.

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactCompiler: true,

  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',  // 이 옵션이 없으면 에러 발생!
      },
    },
  },
};

export default nextConfig;
```

### 설정 상세 설명

1. `turbopack.rules`: Turbopack의 파일 변환 규칙을 정의하는 객체입니다. Webpack의 `module.rules`와 유사한 역할을 합니다.
2. `'*.svg'`: 모든 `.svg` 확장자를 가진 파일에 대해 이 규칙을 적용합니다.
3. `loaders: ['@svgr/webpack']`: SVG 파일을 처리할 로더를 지정합니다. `@svgr/webpack`은 SVG를 React 컴포넌트로 변환해주는 로더입니다.
4. `as: '*.js'` (중요!): 이 옵션이 **가장 중요**합니다. 변환된 SVG를 JavaScript 모듈로 처리하도록 Turbopack에 지시합니다.

```typescript
// as: '*.js'가 없으면
// Turbopack이 변환된 결과를 어떻게 처리해야 할지 몰라서 에러 발생

// as: '*.js'가 있으면
// SVG → React Component → JavaScript Module로 올바르게 변환
```

결과적으로 여기까지 설정하면 Next.js 16 Tuebopack에서 SVGR을 이용해 SVG 아이콘을 사용할 수 있습니다.

## Step 2: 아이콘 시스템 구축

단순히 SVG를 import해서 사용할 수도 있지만, 더 나은 개발자 경험을 위해 아이콘 시스템을 구축할 수 있습니다.

### 디렉토리 구조

아래와 같은 파일구조로 svg가 있다고 가정합니다.

```
src/
  shared/
    assets/
      icons/
        ├── arrow_left.svg
        ├── chart.svg
        ├── comment.svg
        ├── dashboard.svg
        └── index.ts  // 핵심 파일
```

### icons/index.ts 구현

```typescript
// src/shared/assets/icons/index.ts

// 1. 모든 아이콘을 import
import ArrowLeft from './arrow_left.svg';
import Chart from './chart.svg';
import Comment from './comment.svg';
import Dashboard from './dashboard.svg';

// 2. 아이콘 객체로 export (const assertion 사용)
export const Icons = {
  ArrowLeft,
  Chart,
  Comment,
  Dashboard,
} as const;

// 3. 아이콘 이름 타입 자동 추론
export type IconName = keyof typeof Icons;
```

### 코드 상세 설명

#### 1. 개별 import
각 SVG 파일을 개별적으로 import합니다. `@svgr/webpack`이 이들을 React 컴포넌트로 변환합니다.

```typescript
import ArrowLeft from './arrow_left.svg';
```

#### 2. `Icons` 객체 with `as const`

```typescript
export const Icons = {
  ArrowLeft,
  Chart,
  // ...
} as const;
```

**`as const`의 역할:**
- TypeScript에게 이 객체의 값이 변하지 않을 것임을 알려줍니다
- 각 프로퍼티의 타입이 더 정확하게 추론됩니다
- `IconName` 타입이 정확한 리터럴 타입으로 추론됩니다

```typescript
// as const 없으면
type IconName = string  // 너무 광범위

// as const 있으면
type IconName = "ArrowLeft" | "Chart" | "Comment" | "Dashboard" | ... // 정확
```

#### 3. `IconName` 타입

```typescript
export type IconName = keyof typeof Icons;
```

이는 TypeScript의 유틸리티 타입을 활용한 것입니다:

- `typeof Icons`: Icons 객체의 타입을 가져옵니다
- `keyof`: 객체의 모든 키를 유니온 타입으로 만듭니다

결과:
```typescript
type IconName = "ArrowLeft" | "Chart" | "Comment" | "Dashboard" | ...
```

### 타입 안전성의 장점

#### 1. 자동 완성 지원

```typescript
// IDE가 자동으로 아이콘 목록을 보여줌
const icon: IconName = 'ArrowLeft';  // 자동완성!
```

#### 2. 컴파일 타임 에러 감지

```typescript
// 타입 에러: 'InvalidIcon'는 IconName이 아님
const icon: IconName = 'InvalidIcon';  

// 타입 에러: 존재하지 않는 키
const Icon = Icons['WrongIcon'];
```

#### 3. 리팩토링 안전성

아이콘 이름을 변경하면 사용하는 모든 곳에서 TypeScript 에러가 발생하여, 놓치는 부분 없이 안전하게 리팩토링할 수 있습니다.

## 실제 사용 예시

### 방법 1: 직접 사용

```tsx
import { Icons } from '@/shared/assets/icons';

function MyComponent() {
  return (
    <div>
      <Icons.ArrowLeft 
        width={20} 
        height={20} 
        fill="currentColor" 
      />
      <span>뒤로가기</span>
    </div>
  );
}
```

### 방법 2: 동적 사용 (타입 안전)

```tsx
import { Icons, type IconName } from '@/shared/assets/icons';

interface NavItem {
  icon: IconName;  // 타입 안전!
  title: string;
  url: string;
}

const navItems: NavItem[] = [
  { icon: 'Dashboard', title: '대시보드', url: '/dashboard' },
  { icon: 'Chart', title: '통계', url: '/statistics' },
  // { icon: 'Wrong', ... }  // 타입 에러
];

function Navigation() {
  return (
    <nav>
      {navItems.map((item) => {
        const IconComponent = Icons[item.icon];  // 타입 안전
        
        return (
          <a key={item.url} href={item.url}>
            <IconComponent width={20} height={20} />
            <span>{item.title}</span>
          </a>
        );
      })}
    </nav>
  );
}
```

## 아이콘 추가하기

### 1단계: SVG 파일 추가
```
src/shared/assets/icons/new-icon.svg
```

### 2단계: index.ts에 추가

```typescript
// 1. import 추가
import NewIcon from './new-icon.svg';

// 2. Icons 객체에 추가
export const Icons = {
  // ... 기존 아이콘들
  NewIcon,  // 여기에 추가
} as const;
```

### 3단계: 바로 사용

```tsx
<Icons.NewIcon width={20} height={20} />

// 또는
const item: NavItem = {
  icon: 'NewIcon',  // 타입 체크
  title: '새 기능',
  url: '/new',
};
```



## 장단점 비교

### 장점

1. **타입 안전성**: 컴파일 타임에 오타 방지
2. **자동 완성**: IDE 지원으로 개발 생산성 향상
3. **번들 최적화**: 사용하는 아이콘만 번들에 포함
4. **스타일 제어**: CSS로 색상, 크기 자유롭게 변경 가능
5. **관리 용이**: 중앙 집중식 아이콘 관리
6. **리팩토링 안전**: 이름 변경 시 모든 사용처 추적 가능

### 단점

1. **초기 설정**: 설정이 다소 복잡할 수 있음
2. **빌드 시간**: SVG 변환으로 빌드 시간 증가

## 마치며

Next.js 16의 Turbopack에서 SVG를 React 컴포넌트로 사용하는 방법과, TypeScript를 활용한 타입 안전한 아이콘 시스템 구축 방법을 알아보았습니다.

핵심 포인트를 정리하면

1. **`as: '*.js'`** 옵션은 Turbopack에서 필수입니다
2. **`as const`**와 **`keyof typeof`**로 타입 안전성을 확보합니다
3. 중앙 집중식 관리로 유지보수가 쉬워집니다

이 방법을 사용하면 아이콘 관리의 생산성과 안전성을 크게 향상시킬 수 있습니다. 특히 대규모 프로젝트에서 여러 개발자가 협업할 때 더욱 빛을 발합니다.

## 참고 자료

- [Next.js Turbopack 공식 문서](https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack)
- [SVGR 공식 문서](https://react-svgr.com/)

