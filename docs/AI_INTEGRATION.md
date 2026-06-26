# PrepGenius — AI Integration (Qwen)

All generative AI in PrepGenius is served by a **locally-hosted Qwen** model on a
university server that exposes an **OpenAI-compatible `/v1` API**. The backend
talks to it through the official `openai` Python SDK, using chat completions,
streaming, and JSON mode.

---

## 1. Client Setup

The LLM client is configured entirely from environment variables (see
`.env.example`):

| Variable | Default | Purpose |
|----------|---------|---------|
| `QWEN_BASE_URL` | `http://your-university-server:8000/v1` | OpenAI-compatible endpoint |
| `QWEN_API_KEY` | `not-needed-or-your-key` | passed as the SDK key (may be a placeholder) |
| `QWEN_MODEL` | `Qwen2.5-72B-Instruct` | model name sent in requests |
| `QWEN_TIMEOUT` | `120` | per-request timeout (seconds) |
| `QWEN_MAX_TOKENS` | `2048` | default completion cap |
| `QWEN_TEMPERATURE` | `0.4` | default sampling temperature |

Because Qwen is OpenAI-compatible, the integration is just the standard SDK
pointed at a different `base_url`:

```python
from openai import OpenAI
from app.core.config import settings

client = OpenAI(
    base_url=settings.QWEN_BASE_URL,   # university server /v1
    api_key=settings.QWEN_API_KEY,     # placeholder if server is open
    timeout=settings.QWEN_TIMEOUT,
)
```

The wrapper lives in `app/services/llm_service.py` and exposes three primitives:
`chat()` (blocking), `stream_chat()` (token generator for SSE), and
`json_chat()` (structured output).

---

## 2. Modes

### 2.1 Blocking chat
Used for one-shot generations (explanations, study plans, weak-area analysis).

```python
resp = client.chat.completions.create(
    model=settings.QWEN_MODEL,
    messages=messages,
    temperature=settings.QWEN_TEMPERATURE,
    max_tokens=settings.QWEN_MAX_TOKENS,
)
text = resp.choices[0].message.content
```

### 2.2 Streaming chat (SSE)
Used by `POST /api/v1/chat/message`. Tokens are yielded as they arrive and
forwarded to the browser as Server-Sent Events; the full assistant message is
persisted to the `chats` document when the stream ends.

```python
stream = client.chat.completions.create(
    model=settings.QWEN_MODEL,
    messages=messages,
    stream=True,
)
for chunk in stream:
    delta = chunk.choices[0].delta.content
    if delta:
        yield delta          # forwarded as `data: <token>\n\n`
```

### 2.3 JSON mode
Used for MCQ generation, weak-area analysis, and study plans, where the output
must be machine-parseable. Requested via `response_format={"type": "json_object"}`.

```python
resp = client.chat.completions.create(
    model=settings.QWEN_MODEL,
    messages=messages,
    response_format={"type": "json_object"},
    temperature=0.3,
)
data = json.loads(resp.choices[0].message.content)
```

---

## 3. Retries

LLM calls are wrapped with **tenacity** for resilience against transient
failures (timeouts, 5xx, connection resets):

```python
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((TimeoutError, ConnectionError)),
    reraise=True,
)
def _call(...): ...
```

Streaming calls are retried only on connection establishment (not mid-stream).

---

## 4. JSON-Output Robustness

LLMs occasionally wrap JSON in prose or code fences. The JSON path hardens output
as follows:

1. **Ask for JSON explicitly** — JSON mode + a system instruction that specifies
   the exact schema and "respond with JSON only".
2. **Strip fences** — remove ```` ```json ```` / ```` ``` ```` wrappers if present.
3. **Extract the JSON span** — slice from the first `{`/`[` to the matching
   closing bracket if there is leading/trailing text.
4. **Parse + validate** — `json.loads`, then validate against a Pydantic v2 model
   (e.g. `GeneratedMCQ` with exactly 4 options and a 0–3 `correct_index`).
5. **Retry on failure** — if parsing/validation fails, retry the generation once
   with a stricter "your previous output was not valid JSON" reminder; on repeated
   failure, surface a clean error rather than persisting garbage.

---

## 5. Prompt Templates by Feature

> These are the structural templates; the service layer fills in the bracketed
> slots and (for RAG features) prepends the retrieved context block.

### MCQ generation (JSON mode)
```
SYSTEM: You are an expert question setter for Pakistani <test_type> exams.
Generate <n> multiple-choice questions on <subject>/<topic> at <difficulty>
difficulty. Each must have exactly 4 options, one correct answer, and a concise
explanation. Use the provided context where relevant. Respond with JSON only.

CONTEXT: <retrieved chunks>

FORMAT:
{"mcqs":[{"question":"...","options":["..x4.."],"correct_index":0,"explanation":"..."}]}
```

### Explanation
```
SYSTEM: Explain why the correct answer is right and the others are wrong, in
clear, exam-focused language suitable for a <test_type> candidate.
USER: Question: <stem>
Options: <A/B/C/D>
Correct: <option>
```

### Chat (with optional RAG context)
```
SYSTEM: You are PrepGenius, a tutor for Pakistani competitive exams. Be accurate
and concise. <If RAG: Use the provided context; if it is insufficient, say so.>
CONTEXT: <retrieved chunks or empty>
... conversation history ...
USER: <latest message>
```

### Weak-area analysis (JSON mode)
```
SYSTEM: Analyze the candidate's per-topic performance and identify weaknesses.
Respond with JSON only.
USER: Per-topic results: <{topic: {correct, total}} from attempts>
FORMAT: {"weak_areas":[{"topic":"...","accuracy":0.42,"advice":"..."}]}
```

### Study plan (JSON mode)
```
SYSTEM: Build a <horizon_days>-day study plan for <test_type>, prioritizing the
candidate's weak areas. Use the syllabus context. Respond with JSON only.
CONTEXT: <syllabus chunks>
FORMAT: {"days":[{"day":1,"focus":"...","tasks":["..."]}]}
```

### Topic recommendations
```
SYSTEM: Recommend the next topics to study for <test_type> given recent
performance and remaining syllabus coverage. Be specific and prioritized.
```

---

## 6. Pointing at the University Server

Set these in `.env` (no code changes needed):

```bash
QWEN_BASE_URL=http://10.0.0.5:8000/v1      # your server's OpenAI-compatible endpoint
QWEN_API_KEY=not-needed-or-your-key        # if the server requires a key, put it here
QWEN_MODEL=Qwen2.5-72B-Instruct            # must match the served model name
QWEN_TIMEOUT=120
```

Verify connectivity from the backend container:

```bash
curl -s "$QWEN_BASE_URL/models" -H "Authorization: Bearer $QWEN_API_KEY"
# or a smoke chat:
curl -s "$QWEN_BASE_URL/chat/completions" \
  -H "Authorization: Bearer $QWEN_API_KEY" -H "Content-Type: application/json" \
  -d '{"model":"Qwen2.5-72B-Instruct","messages":[{"role":"user","content":"ping"}]}'
```

---

## 7. Swapping Models

Because the integration depends only on the **OpenAI-compatible contract**, you
can swap the backing model with no code changes:

- **Different Qwen size / version**: change `QWEN_MODEL` (and `QWEN_BASE_URL` if
  it moves). Adjust `QWEN_MAX_TOKENS` to the model's context window.
- **A different OpenAI-compatible server** (vLLM, TGI, Ollama's OpenAI shim,
  LM Studio, or hosted OpenAI/Together): point `QWEN_BASE_URL`/`QWEN_API_KEY`
  there and set `QWEN_MODEL` to that provider's model id.
- **Verify JSON mode support**: not every server implements
  `response_format={"type":"json_object"}`. If unsupported, the JSON-robustness
  steps in §4 (fence stripping + span extraction + validation + retry) still
  recover usable JSON from a plain completion.
- **Re-tune sampling**: smaller models may need lower `QWEN_TEMPERATURE` for
  reliable structured output. Embeddings are independent (bge-m3) and are not
  affected by swapping the chat model.
