# Judge Image Advice

사진 기반 `선비의 한마디`는 기존 텍스트 입력에 이미지 업로드를 더한 기능이다. 사용자는 텍스트만, 사진만, 또는 텍스트와 사진을 함께 보내 선비유형별 조언을 받을 수 있다.

## User Flow

- `/judge`는 기존처럼 선비유형 테스트 결과가 있어야 접근할 수 있다.
- 텍스트 입력은 계속 지원한다.
- 이미지 업로드 후 미리보기를 보여주며, 사용자는 이미지를 제거할 수 있다.
- 텍스트와 이미지가 모두 없으면 `고민을 적거나 사진을 올려주세요.` 안내를 표시한다.

## Supported Images

지원 형식:

- `image/jpeg`
- `image/png`
- `image/webp`

브라우저에서 이미지를 최대 1024px 너비 또는 높이로 리사이즈한다. 전송용 base64 data URL이 약 1MB를 넘으면 업로드를 거부하고 `이미지 용량이 큽니다. 더 작은 이미지를 올려주세요.` 문구를 표시한다.

## Storage Policy

원본 이미지는 저장하지 않는다.

- localStorage에 이미지 원본이나 base64를 저장하지 않는다.
- Supabase analytics에 이미지 원본이나 base64를 저장하지 않는다.
- 서버 로그에 `imageDataUrl`을 출력하지 않는다.
- 사용자 입력 전문도 analytics나 서버 로그에 남기지 않는다.

## OpenAI Request

`/api/judge`는 `imageDataUrl`이 있을 때 OpenAI chat completions 메시지에 이미지 입력을 함께 전달한다. 사용하는 OpenAI 모델은 이미지 입력을 지원해야 한다. 기본 모델은 서버의 `OPENAI_MODEL` 환경변수가 없을 때 `gpt-4o-mini`를 사용한다.

응답 구조는 기존 필드를 유지한다.

- `seonbiAdvice`
- `modernTranslation`
- `shareText`
- `imageObservation` optional

## Safety

사진 속 인물이 있어도 신원, 이름, 나이, 성별, 민감정보를 추정하지 않는다. 얼굴 인식이나 특정인 식별을 시도하지 않는다.

## Fallback

텍스트 전용 요청의 기존 안전 실패 응답은 유지한다. 이미지가 포함된 요청에서 OpenAI 이미지 처리가 실패하면 `사진 속 분위기를 정확히 읽지는 못했지만...`으로 시작하는 안전한 fallback 결과를 반환해 화면이 깨지지 않게 한다.

## Analytics

사진 기반 한마디 요청 시 `judge_image_used` 이벤트를 기록한다.

저장하는 값:

- `user_id`: 로그인한 경우 Supabase Auth user id
- `seonbiType`
- `metadata.hasImage`
- `metadata.hasText`

저장하지 않는 값:

- 사진 원본
- base64 data URL
- 사용자 입력 전문
- 이메일, 이름, 전화번호, 비밀번호

`analytics_events` 테이블에 check constraint를 사용 중이면 `judge_image_used`를 허용 목록에 추가해야 한다.
