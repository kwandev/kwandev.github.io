---
title: React Router 7에서 똑똑한 뒤로가기 구현하기
description: React Router 7에서 뒤로가기 버튼을 구현하는 방법을 알아보자
date: 2026-02-03
tags:
  - React
  - React Router
  - Remix
---

## 들어가며

웹 애플리케이션을 만들다 보면 "뒤로가기" 버튼을 구현해야 하는 경우가 있습니다. 특히 상세 페이지에서 목록으로 돌아가는 버튼은 거의 필수죠.

그런데 단순히 `navigate(-1)`로 구현하면 문제가 생깁니다. URL을 통해 상세 페이지에 직접 접근한 경우, 뒤로가기를 누르면 브라우저 빈 페이지나 이전에 머물렀던 전혀 다른 사이트로 이동하게 되거든요.

이 글에서는 React Router 7의 `location.key`를 활용해서, 상황에 맞게 동작하는 똑똑한 뒤로가기 버튼을 구현하는 방법을 공유합니다.

## 문제 상황

제가 만들고 있던 서비스에는 다음과 같은 구조가 있었습니다:

- `/books` - 책 목록 페이지
- `/books/:id` - 책 상세 페이지

### 시나리오 1. 정상적인 흐름

```
목록 페이지(/books)
  → 상세 페이지 클릭(/books/123)
  → 뒤로가기 버튼 클릭
  → 목록 페이지(/books)로 복귀 ✅
```

이 경우는 `navigate(-1)`만으로도 완벽하게 동작합니다.

### 시나리오 2. 직접 접근

```
URL을 통해 상세 페이지 직접 접근(/books/123)
  → 뒤로가기 버튼 클릭
  → ??? ❌
```

문제는 이 경우입니다. 사용자가 브라우저 히스토리에 뭐가 있는지에 따라 결과가 달라집니다.

- 다른 사이트에서 링크를 타고 왔다면 → 그 사이트로 돌아감
- 주소창에 URL을 직접 입력했다면 → 브라우저 빈 페이지(about:blank)

사용자 입장에서는 "뒤로가기를 눌렀는데 서비스를 벗어나버린" 띠용하는 경험이 됩니다.

## 해결책: location.key를 활용한 조건부 네비게이션

React Router는 이런 상황을 구분할 수 있는 방법을 제공합니다. 바로 `location.key`입니다.

```tsx
import { useNavigate, useLocation } from "react-router";

export default function BookDetail() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBackClick = () => {
    if (location.key === "default") {
      // 직접 접근한 경우: 목록 페이지로 이동
      navigate("/books");
    } else {
      // 히스토리가 있는 경우: 뒤로가기
      navigate(-1);
    }
  };

  return (
    <div>
      <button onClick={handleBackClick}>← 뒤로가기</button>
      <h1>책 상세 정보</h1>
      {/* ... */}
    </div>
  );
}
```

이제 두 시나리오 모두 완벽하게 동작합니다.

- 목록에서 왔다면 → `navigate(-1)`로 목록으로 복귀
- URL로 직접 왔다면 → `navigate("/books")`로 목록으로 이동

## location.key란 무엇인가?

`location.key`는 React Router가 각 location(위치)에 부여하는 고유 식별자입니다.

### location 객체의 구조

```typescript
interface Location {
  pathname: string; // "/books/123"
  search: string; // "?sort=title"
  hash: string; // "#review"
  state: any; // 커스텀 상태
  key: string; // 고유 식별자 (주목)
}
```

### key의 특별한 점

> This value is always 'default' on the initial location.

location.key는 **최초 진입 시에 항상 'default' 값**을 가집니다.

```typescript
// 브라우저를 열고 직접 URL 입력
location.key; // "default"

// 앱 내에서 navigate()로 이동
location.key; // "abc123" (랜덤한 고유 문자열)
```

### key는 언제 생성되나?

React Router가 다음과 같은 경우에 새로운 key를 생성합니다.

1. `<NavLink>`, `<Link>` 컴포넌트로 이동
2. `navigate()` 함수 호출
3. `<Form>` 제출 후 리다이렉트
4. 브라우저 뒤로가기/앞으로가기 (이미 존재하는 key 재사용)

반대로 다음의 경우 key는 "default"입니다.

1. 브라우저 주소창에 URL 직접 입력
2. 외부 링크에서 접근
3. 북마크에서 접근
4. 새 탭/창으로 열기

## 히스토리 스택과 key

React Router의 히스토리 관리를 이해하면 key의 역할이 명확해집니다.

### 정상 흐름의 히스토리

```
1. 앱 시작 (/)
   key: "default"
   히스토리: [/]

2. 목록 페이지로 이동 (/books)
   key: "aaa111" (랜덤 문자열)
   히스토리: [/, /books]

3. 상세 페이지로 이동 (/books/123)
   key: "bbb222"
   히스토리: [/, /books, /books/123]

4. 뒤로가기 실행
   → navigate(-1)
   → 히스토리에서 한 칸 뒤로
   → /books (key: "aaa111") 복귀
```

이 경우 `location.key`는 "bbb222" 같은 값이므로, `navigate(-1)`이 안전하게 작동합니다.

### 직접 접근의 히스토리

```
1. URL로 직접 접근 (/books/123)
   key: "default"
   히스토리: [/books/123]

2. 뒤로가기 실행
   → navigate(-1) 시도
   → 히스토리가 비어있음
   → 브라우저 기본 동작 (이전 사이트/빈 페이지)
```

이 경우 `location.key === "default"`이므로, 우리는 `navigate("/books")`로 명시적으로 목록 페이지로 보낼 수 있습니다.

## 주의사항

### 1. HashRouter에서는 동작하지 않음

`location.key`는 BrowserRouter에서 지원됩니다. HashRouter를 사용한다면 이 패턴은 작동하지 않습니다.

### 2. replace를 사용한 경우

`navigate(path, { replace: true })`를 사용하면 히스토리 스택에 추가하지 않고 현재 항목을 교체합니다. 이 경우 key는 변경되지만 히스토리 길이는 그대로입니다.

```tsx
// 히스토리: [/, /books]

navigate("/books/123", { replace: true });

// 히스토리: [/, /books/123]
// key는 새로 생성되지만, 뒤로가기하면 /로 이동
```

## 실제 사용 사례

제 프로젝트에서 이 패턴을 적용한 결과

**AS-IS**

- 사용자가 네이버를 보던 중, 동료에게 공유받은 링크로 상세 페이지에 다이렉트 접근
- 뒤로가기 버튼 클릭
- 네이버로 돌아감 (서비스 이탈) ㅠㅠ

**TO-BE**

- 사용자가 네이버를 보던 중, 동료에게 공유받은 링크로 상세 페이지에 다이렉트 접근
- 뒤로가기 버튼 클릭
- 목록 페이지로 이동 (서비스 유지) 👍

## 마치며

`location.key`는 React Router가 제공하는 강력하지만 잘 알려지지 않은 기능입니다. 단순히 고유 식별자 역할만 하는 게 아니라, 사용자가 어떻게 페이지에 도착했는지를 판단하는 키가 되기도 합니다.

"default"라는 하나의 값만 체크하는 것으로, 우리는 사용자에게 훨씬 더 나은 네비게이션 경험을 제공할 수 있습니다. 외부에서 접근하든, 앱 내에서 이동하든, 사용자는 항상 적절한 곳으로 돌아갈 수 있습니다.

여러분의 프로젝트에도 뒤로가기 버튼이 있다면, 한번 적용해보세요. 사용자들이 "어? 어디로 간 거지?" 하는 당황스러운 경험을 하지 않을 겁니다.

---

**참고 자료**

- [React Router - useLocation](https://reactrouter.com/api/hooks/useLocation)
- [React Router API Reference - useLocation](https://api.reactrouter.com/v7/functions/react-router.useLocation.html)
- [React Router API Reference - Location](https://api.reactrouter.com/v7/interfaces/react-router.Location.html)
