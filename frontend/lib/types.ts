// Shared TypeScript types for PrepGenius frontend

export type Role = "user" | "admin";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active?: boolean;
  is_verified?: boolean;
  target_exams?: string[];
  avatar_url?: string | null;
  created_at?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface UsageFeature {
  used: number;
  limit: number;
  unlimited: boolean;
}

export interface Usage {
  plan: string;
  features: {
    mcq: UsageFeature;
    chat: UsageFeature;
    mocktest: UsageFeature;
  };
}

export type ExamType =
  | "FPSC"
  | "NTS"
  | "PPSC"
  | "EST"
  | "CSS"
  | "PMS"
  | "Lecturer";

export type Difficulty = "easy" | "medium" | "hard";

export interface MCQOptions {
  A: string;
  B: string;
  C: string;
  D: string;
}

export interface MCQ {
  id: string;
  question: string;
  options: MCQOptions;
  answer?: string;
  explanation?: string;
  topic?: string;
  difficulty?: string;
}

export interface MCQGenerateRequest {
  test_type: string;
  subject_id?: string;
  subject_name: string;
  topic_id?: string;
  topic_name?: string;
  difficulty: string;
  count: number;
}

export type TestMode = "full" | "subject" | "topic";

export interface Test {
  id: string;
  title: string;
  test_type: string;
  mode: TestMode;
  subject_ids?: string[];
  topic_ids?: string[];
  difficulty?: string;
  num_questions: number;
  duration_minutes: number;
  created_at?: string;
}

export interface CreateTestRequest {
  title: string;
  test_type: string;
  mode: TestMode;
  subject_ids: string[];
  topic_ids: string[];
  difficulty: string;
  num_questions: number;
  duration_minutes: number;
  section_spec?: unknown;
}

export interface TestQuestion {
  id: string;
  question: string;
  options: MCQOptions;
  topic?: string;
  difficulty?: string;
}

export interface Attempt {
  id: string;
  test_id: string;
  started_at?: string;
  submitted_at?: string | null;
}

export interface StartTestResponse {
  attempt: Attempt;
  questions: TestQuestion[];
}

export interface PerTopicStat {
  topic: string;
  correct: number;
  total: number;
}

export interface TestResult {
  score: number;
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
  per_topic: PerTopicStat[];
}

export interface ReviewItem {
  question: string;
  options: MCQOptions;
  user_answer: string | null;
  correct_answer: string;
  explanation: string;
  is_correct: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  created_at?: string;
  updated_at?: string;
}

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

export interface ConversationDetail extends Conversation {
  messages: ChatMessage[];
}

export interface AnalyticsOverview {
  total_tests?: number;
  total_attempts?: number;
  average_score?: number;
  total_mcqs?: number;
  score_trend?: { date: string; score: number }[];
  per_subject?: { subject: string; score: number }[];
  recent_attempts?: RecentAttempt[];
}

export interface RecentAttempt {
  attempt_id: string;
  test_title: string;
  score: number;
  total: number;
  submitted_at?: string;
}

export interface WeakArea {
  topic: string;
  subject?: string;
  accuracy: number;
  attempts?: number;
}

export interface Recommendation {
  title: string;
  description: string;
  action?: string;
}

export interface StudyPlanRequest {
  test_type: string;
  subject: string;
  days: number;
  hours_per_day: number;
}

export interface StudyPlanDay {
  day: number;
  date?: string;
  topics: string[];
  focus?: string;
  hours?: number;
}

export interface StudyPlan {
  id?: string;
  test_type: string;
  subject: string;
  days: number;
  hours_per_day: number;
  plan: StudyPlanDay[];
  created_at?: string;
}

export interface Plan {
  key: string;
  name: string;
  price: number;
  duration_days: number;
  features: string[];
}

export interface Subscription {
  plan: string;
  status?: string;
  started_at?: string;
  expires_at?: string;
  auto_renew?: boolean;
}

export interface PaymentRedirect {
  url: string;
  params: Record<string, string>;
}

export interface SubscribeResponse {
  payment: { id: string; amount: number; status: string };
  redirect: PaymentRedirect;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  plan: string;
  provider: string;
  status: string;
  created_at: string;
}

// ---- Manual (JazzCash/Easypaisa transfer) payment flow ----
export type PaymentProvider = "jazzcash" | "easypaisa";

export type PaymentStatus = "pending" | "approved" | "rejected";

export interface PaymentMethod {
  provider: PaymentProvider;
  label: string;
  account_title: string;
  number?: string; // jazzcash only
  iban: string;
  instructions: string;
}

export interface PaymentPlan {
  id: "pro" | "premium";
  name: string;
  price: number;
  duration_days: number;
  features: string[];
}

export interface PaymentMethodsResponse {
  account_name: string;
  methods: PaymentMethod[];
  plans: PaymentPlan[];
}

export interface ManualPayment {
  id: string;
  plan: string;
  amount: number;
  currency?: string;
  provider: string;
  method?: string;
  status: PaymentStatus;
  sender_name?: string;
  transaction_ref?: string;
  created_at: string;
  reject_reason?: string;
}

export interface AdminPayment {
  id: string;
  user_email: string;
  plan: string;
  amount: number;
  provider: string;
  status: PaymentStatus;
  sender_name?: string;
  sender_number?: string;
  transaction_ref?: string;
  created_at: string;
  proof_file?: string;
  reject_reason?: string;
}

export interface ApiKey {
  id: string;
  name: string;
  scopes: string[];
  prefix?: string;
  api_key?: string; // plaintext, only on creation
  created_at?: string;
  expires_at?: string | null;
  last_used_at?: string | null;
  is_active?: boolean;
}

export interface ApiKeyUsage {
  total_requests: number;
  by_day?: { date: string; count: number }[];
  by_endpoint?: { endpoint: string; count: number }[];
}

export interface Subject {
  id: string;
  name: string;
  test_type?: string;
}

export interface Topic {
  id: string;
  subject_id: string;
  name: string;
}

export interface AdminAnalyticsOverview {
  total_users?: number;
  active_users?: number;
  total_tests?: number;
  total_mcqs?: number;
  total_conversations?: number;
  new_users_trend?: { date: string; count: number }[];
}

export interface RevenueAnalytics {
  total_revenue?: number;
  mrr?: number;
  by_plan?: { plan: string; revenue: number; count: number }[];
  revenue_trend?: { date: string; revenue: number }[];
}

export interface LogEntry {
  id?: string;
  level: string;
  message: string;
  timestamp: string;
  source?: string;
}

export interface DocumentRecord {
  id: string;
  filename: string;
  kind: string;
  test_type?: string;
  subject_id?: string;
  status: string; // uploaded | processing | indexed | failed
  source?: string;
  created_at?: string;
}
