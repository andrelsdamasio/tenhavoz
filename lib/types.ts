export type SendMode = "bcc" | "to";
export type CampaignStatus = "draft" | "paid" | "published";
export type PaymentProvider = "stripe" | "mercadopago";
export type PaymentStatus = "pending" | "confirmed" | "failed" | "refunded";
export type TemplateId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type EventType = "view" | "click";
export type CouponDiscountType = "percent" | "fixed";
/** Duração da campanha publicada, em horas: 72h ou 7 dias. */
export type CampaignDuration = 72 | 168;

export interface Campaign {
  id: string;
  user_id: string;
  title: string;
  /** Resumo curto (IA ou manual) mostrado abaixo do título na página pública. */
  subtitle: string | null;
  manifest_text: string;
  subject: string;
  recipients: string[];
  send_mode: SendMode;
  drive_link: string | null;
  template_id: TemplateId;
  /** Cor hex escolhida por quem criou a campanha; null = cor padrão da template. */
  theme_color: string | null;
  slug: string | null;
  status: CampaignStatus;
  /** Escolhido no checkout; null nas campanhas criadas antes desse recurso. */
  duration_hours: CampaignDuration | null;
  /** Calculado na publicação (published_at + duration_hours); null = nunca expira. */
  expires_at: string | null;
  /** Quando o dono foi avisado (por e-mail) de que a campanha está para encerrar. */
  expiry_notified_at: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  campaign_id: string;
  provider: PaymentProvider;
  provider_payment_id: string;
  status: PaymentStatus;
  amount: number;
  coupon_code: string | null;
  created_at: string;
}

export interface CampaignEvent {
  id: string;
  campaign_id: string;
  type: EventType;
  created_at: string;
}

export interface AppSettings {
  id: true;
  price_72h_brl_cents: number;
  price_7d_brl_cents: number;
  enabled_templates: TemplateId[];
  manifest_char_limit: number;
  manifest_char_limit_enabled: boolean;
  template_color_palette: string[];
  updated_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: CouponDiscountType;
  discount_value: number;
  max_redemptions: number | null;
  redemption_count: number;
  active: boolean;
  expires_at: string | null;
  created_at: string;
}

export interface PaymentFollowup {
  provider_payment_id: string;
  alerted_at: string | null;
  customer_alerted_at: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface Referral {
  referred_user_id: string;
  referrer_user_id: string;
  slug: string;
  created_at: string;
  rewarded_at: string | null;
  coupon_code: string | null;
}

export interface InboxMessage {
  id: string;
  resend_email_id: string;
  from_address: string;
  to_addresses: string[];
  subject: string;
  text_body: string | null;
  attachments_count: number;
  received_at: string;
  forwarded_at: string | null;
  read_at: string | null;
  direction: "in" | "out";
  reply_to_id: string | null;
}

export interface CampaignComment {
  id: string;
  campaign_id: string;
  user_id: string;
  author_name: string;
  body: string;
  reported_at: string | null;
  like_count: number;
  created_at: string;
}

export interface CommentLike {
  comment_id: string;
  user_id: string;
  created_at: string;
}

export interface AdminAuditEntry {
  id: string;
  admin_email: string;
  action: string;
  campaign_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      campaigns: {
        Row: Campaign;
        Insert: Partial<Campaign> &
          Pick<
            Campaign,
            "user_id" | "title" | "manifest_text" | "subject" | "recipients" | "send_mode" | "template_id"
          >;
        Update: Partial<Campaign>;
      };
      payments: {
        Row: Payment;
        Insert: Partial<Payment> &
          Pick<Payment, "user_id" | "campaign_id" | "provider" | "provider_payment_id" | "status" | "amount">;
        Update: Partial<Payment>;
      };
      events: {
        Row: CampaignEvent;
        Insert: Pick<CampaignEvent, "campaign_id" | "type">;
        Update: never;
      };
      app_settings: {
        Row: AppSettings;
        Insert: Partial<AppSettings>;
        Update: Partial<AppSettings>;
      };
      inbox_messages: {
        Row: InboxMessage;
        Insert: Partial<InboxMessage> &
          Pick<InboxMessage, "resend_email_id" | "from_address">;
        Update: Partial<InboxMessage>;
      };
      payment_followups: {
        Row: PaymentFollowup;
        Insert: Partial<PaymentFollowup> & Pick<PaymentFollowup, "provider_payment_id">;
        Update: Partial<PaymentFollowup>;
      };
      referrals: {
        Row: Referral;
        Insert: Partial<Referral> & Pick<Referral, "referred_user_id" | "referrer_user_id" | "slug">;
        Update: Partial<Referral>;
      };
      campaign_comments: {
        Row: CampaignComment;
        Insert: Partial<CampaignComment> & Pick<CampaignComment, "campaign_id" | "user_id" | "author_name" | "body">;
        Update: Partial<CampaignComment>;
      };
      comment_likes: {
        Row: CommentLike;
        Insert: Partial<CommentLike> & Pick<CommentLike, "comment_id" | "user_id">;
        Update: Partial<CommentLike>;
      };
      admin_audit_log: {
        Row: AdminAuditEntry;
        Insert: Partial<AdminAuditEntry> & Pick<AdminAuditEntry, "admin_email" | "action">;
        Update: Partial<AdminAuditEntry>;
      };
      coupons: {
        Row: Coupon;
        Insert: Partial<Coupon> & Pick<Coupon, "code" | "discount_type" | "discount_value">;
        Update: Partial<Coupon>;
      };
    };
    Functions: {
      campaign_totals: {
        Args: { p_ids: string[] };
        Returns: { campaign_id: string; views: number; clicks: number }[];
      };
      campaign_daily: {
        Args: { p_ids: string[]; p_days: number };
        Returns: { campaign_id: string; day: string; views: number; clicks: number }[];
      };
    };
  };
}
