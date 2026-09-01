export type SendMode = "bcc" | "to";
export type CampaignStatus = "draft" | "paid" | "published";
export type PaymentProvider = "stripe" | "mercadopago";
export type PaymentStatus = "pending" | "confirmed" | "failed";
export type TemplateId = 1 | 2 | 3 | 4 | 5;
export type EventType = "view" | "click";

export interface Campaign {
  id: string;
  user_id: string;
  title: string;
  manifest_text: string;
  subject: string;
  recipients: string[];
  send_mode: SendMode;
  drive_link: string | null;
  template_id: TemplateId;
  slug: string | null;
  status: CampaignStatus;
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
  campaign_price_brl_cents: number;
  enabled_templates: TemplateId[];
  updated_at: string;
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
    };
  };
}
