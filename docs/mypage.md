# MyPage

마이페이지는 로그인한 사용자가 자신의 선비유형 테스트 결과와 Supabase에 저장한 관심 코스를 확인하는 화면이다.

## Route

- `/mypage`

## Access

- 로그인 사용자는 상단 네비게이션에서 `마이페이지` 링크를 볼 수 있다.
- 비로그인 사용자가 `/mypage`에 직접 접근하면 로그인 안내 화면을 표시한다.
- 안내 화면은 `/login`, `/signup`으로 이동하는 버튼만 제공한다.

## Displayed Data

### 나의 선비유형

- `localStorage`의 기존 선비유형 테스트 결과를 읽어 표시한다.
- 결과가 없으면 `아직 선비유형 테스트 결과가 없습니다.` 문구와 테스트 시작 버튼을 보여준다.
- 서버에는 선비유형 결과를 새로 저장하지 않는다.

### 저장한 관심 코스

- 현재 Supabase Auth 세션의 access token으로 `favorite_courses`를 조회한다.
- 표시 항목은 `title`, `address`, `first_image`, `content_type_id`이다.
- 저장된 코스가 없으면 `아직 저장한 관심 코스가 없습니다.` 문구와 추천 코스 이동 버튼을 보여준다.
- 카드의 `저장 해제` 버튼은 현재 사용자의 `content_id` 항목만 삭제한다.

## Stored Data

`favorite_courses`에는 관심 코스 저장 기능에서 허용한 아래 데이터만 사용한다.

- `user_id`
- `content_id`
- `content_type_id`
- `title`
- `address`
- `first_image`
- `map_x`
- `map_y`

## Not Stored

- 비밀번호
- 전화번호
- 사용자의 선비의 한마디 입력 전문
- 이메일을 analytics 이벤트 payload로 저장하지 않는다.

## Analytics

마이페이지에서 관심 코스를 삭제하면 기존 `removeFavoriteCourse` 유틸을 통해 `favorite_course_removed` 이벤트가 기록된다. analytics에는 Supabase Auth user id만 포함될 수 있으며 이메일은 저장하지 않는다.
