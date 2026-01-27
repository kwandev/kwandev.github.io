---
title: React Router 7에서 meta 정보 설정하기. 근데 이제 React 19를 곁들인
description: React Router 7에서 meta 정보를 설정하는 방법을 알아봅니다
date: 2026-01-27
tags:
  - React
  - React Router
  - Remix
---

## 들어가며

React Router 7(Remix)를 사용하다 보면 페이지의 메타 정보를 설정해야 하는 경우가 많습니다. SEO를 위한 title, description, 소셜 미디어 공유를 위한 Open Graph 태그 등이 대표적이죠.

React Router 7 프레임워크 모드에서는 전통적으로 route module에서 `meta` 함수를 export 하는 방식을 사용했습니다. 하지만 React 19부터는 상황이 조금 달라졌습니다. React 19에 메타 태그를 다루는 기능이 내장되면서, [React Router 7 공식 문서](https://reactrouter.com/start/framework/route-module#meta)에서도 이제는 React의 표준 방법을 사용하라고 안내하고 있습니다.

![React Router 7 meta 변경 안내](/imgs/rr7-react19-meta/rr7-react19-meta-info.png)

이 글에서는 기존 React Router 7 방식과 React 19의 새로운 방식을 비교하고, 어떤 방식을 선택해야 할지 살펴보겠습니다.

## React Router 7의 방식: meta 함수

React Router 7의 프레임워크 모드에서는 route module에서 `meta` 함수를 export 하여 메타 정보를 정의했습니다.

기본적인 사용법은 다음과 같습니다.

```tsx
// app/routes/about.tsx
export function meta() {
  return [
    { title: "About Us" },
    {
      name: "description",
      content: "Learn more about our company",
    },
    {
      property: "og:title",
      content: "About Us - My Company",
    },
  ];
}

export default function About() {
  return <div>About page content</div>;
}
```

이 방식의 특징

- route module 레벨에서 메타 정보를 관리
- 배열 형태로 여러 메타 태그를 정의
- loader, clientLoader 데이터를 활용한 동적 메타 정보 생성 가능

```tsx
export function meta({ loaderData }: Route.MetaArgs) {
  const { post } = loaderData;
  return [
    { title: post.title },
    { name: "description", content: post.summary },
  ];
}
```

`<Meta />` 컴포넌트를 root.tsx에 배치하면 자동으로 렌더링됩니다:

```tsx
// app/root.tsx
import { Meta } from "react-router";

export default function Root() {
  return (
    <html>
      <head>
        <Meta />
      </head>
      <body>{/* ... */}</body>
    </html>
  );
}
```

## React 19의 새로운 방식: 내장 <meta> 컴포넌트

React 19부터는 `<meta>` 태그를 컴포넌트 내부에서 직접 사용할 수 있습니다. React가 자동으로 document의 `<head>`에 배치해줍니다.

```tsx
// app/routes/about.tsx
export default function About() {
  return (
    <div>
      <title>About Us</title>
      <meta name="description" content="Learn more about our company" />
      <meta property="og:title" content="About Us - My Company" />

      {/* 실제 페이지 컨텐츠 */}
      <h1>About Our Company</h1>
      <p>We are a great company...</p>
    </div>
  );
}
```

이 방식의 특징

- 컴포넌트 내부 어디서든 `<meta>` 태그 사용 가능
- React가 자동으로 `<head>`로 호이스팅
- 조건부 렌더링, 상태 기반 메타 정보 설정이 더 자연스러움

동적 데이터를 사용하는 경우도 매우 직관적입니다

```tsx
import { useLoaderData } from "react-router";

export async function loader({ params }) {
  const post = await getPost(params.id);
  return { post };
}

export default function Post() {
  const { post } = useLoaderData<typeof loader>();

  return (
    <article>
      <title>{post.title}</title>
      <meta name="description" content={post.summary} />
      <meta property="og:title" content={post.title} />
      <meta property="og:image" content={post.coverImage} />

      <h1>{post.title}</h1>
      <div>{post.content}</div>
    </article>
  );
}
```

## 두 방식 비교

### React Router 7 meta 함수 방식

**장점**

- 메타 정보가 route module 레벨에서 명확하게 분리됨 (URL 기준으로 확실하게 분리)
- 타입 안정성이 명시적 (자동완성 가능)
- 기존 Remix/React Router 프로젝트와의 일관성

**단점**

- 별도의 함수를 export 해야 함
- React 19의 표준은 아님. React Router 7(Remix)의 기능

### React 19 내장 방식

**장점**

- React의 표준 기능
- 컴포넌트 내부에서 직접 작성 가능
- 조건부 메타 태그 설정이 더 자연스러움
- React Router 팀이 권장하는 방식

**단점**

- 기존 프로젝트를 마이그레이션 가능성 있음
- JSX 내부에 메타 정보가 섞여 있어 코드가 길어질 수 있음 (UI와 meta 정보가 섞임)

## 실전 예제: 조건부 메타 태그

1. React Router7의 meta 함수 방식

```tsx
export function meta({ data }: Route.MetaArgs) {
  const tags = [
    { title: `${data.product.name} - Our Store` },
    { name: "description", content: data.product.description },
  ];

  // 할인 중일 때만 커스텀 메타 태그 추가
  if (data.product.onSale) {
    tags.push({
      property: "product:sale_price",
      content: data.product.salePrice,
    });
  }

  // 재고가 있다면 커스텀 메타 태그 추가
  if (data.product.inStock) {
    tags.push({ property: "product:availability", content: "in stock" });
  }

  return tags;
}
```

2. React 19 내장 방식

```tsx
export default function Product() {
  const { product } = useLoaderData<typeof loader>();

  return (
    <div>
      <title>{product.name} - Our Store</title>
      <meta name="description" content={product.description} />

      {/* 할인 중일 때만 커스텀 메타 태그 추가 */}
      {product.onSale && (
        <meta property="product:sale_price" content={product.salePrice} />
      )}

      {/* 재고가 있다면 커스텀 메타 태그 추가 */}
      {product.inStock && (
        <meta property="product:availability" content="in stock" />
      )}

      {/* 여거시부터 UI 표현 */}
      <h1>{product.name}</h1>
      {/* ... */}
    </div>
  );
}
```

어떤게 더 나은 것 같나요?

## 어떤 방식을 선택해야 할까?

**새 프로젝트라면**

- React 19의 내장 `<meta>` 컴포넌트 사용을 권장합니다
- React Router 공식 문서에서도 이 방식을 안내하고 있습니다
- React의 표준이니까

**기존 프로젝트라면**

- 급하게 마이그레이션할 필요는 없습니다
- **두 방식을 같이 사용해도 동작합니다**
- 새로 작성하는 route부터 React 19 방식을 적용하는 것을 추천합니다

## 마치며

별도의 `meta` 함수를 export 하는 대신, 컴포넌트 내부에서 직접 `<meta>` 태그를 사용하는 방식은 더 직관적입니다. React가 알아서 `<head>`에 배치해주니 우리는 그저 필요한 곳에 메타 정보를 선언하기만 하면 됩니다.

물론 기존 방식도 여전히 동작합니다. 하지만 새 프로젝트를 시작한다면, React 19의 표준 방식을 따르는 것이 좋겠습니다. React Router 팀도 그렇게 권장하고 있으니까요.

---

## 참고 자료

- [React Router 7 - Route Module (meta)](https://reactrouter.com/start/framework/route-module#meta)
- [React 19 - <meta> Component](https://react.dev/reference/react-dom/components/meta)
