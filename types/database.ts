export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          client_name: string | null;
          status: "active" | "archived";
          selected_territory_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          client_name?: string | null;
          status?: "active" | "archived";
          selected_territory_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["projects"]["Insert"]>;
        Relationships: [];
      };
      project_inputs: {
        Row: {
          id: string;
          project_id: string;
          type: "brief" | "note" | "url" | "image" | "document";
          content: string | null;
          asset_url: string | null;
          asset_summary: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          type: "brief" | "note" | "url" | "image" | "document";
          content?: string | null;
          asset_url?: string | null;
          asset_summary?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["project_inputs"]["Insert"]>;
        Relationships: [];
      };
      workflow_stages: {
        Row: {
          id: string;
          project_id: string;
          stage: "brief" | "direction" | "production" | "review" | "export";
          status: "idle" | "in_progress" | "needs_review" | "complete" | "failed";
          summary: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          stage: "brief" | "direction" | "production" | "review" | "export";
          status?: "idle" | "in_progress" | "needs_review" | "complete" | "failed";
          summary?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["workflow_stages"]["Insert"]>;
        Relationships: [];
      };
      agent_runs: {
        Row: {
          id: string;
          project_id: string;
          agent_type: "brief_intelligence" | "creative_director" | "copywriter" | "art_director" | "production_planner" | "qa_critic" | "export_agent" | "feedback_engine";
          stage: "brief" | "direction" | "production" | "review" | "export";
          status: "pending" | "running" | "complete" | "failed";
          input: Json | null;
          output: Json | null;
          error: string | null;
          model: string | null;
          duration_ms: number | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          agent_type: Database["public"]["Tables"]["agent_runs"]["Row"]["agent_type"];
          stage: Database["public"]["Tables"]["agent_runs"]["Row"]["stage"];
          status?: Database["public"]["Tables"]["agent_runs"]["Row"]["status"];
          input?: Json | null;
          output?: Json | null;
          error?: string | null;
          model?: string | null;
          duration_ms?: number | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["agent_runs"]["Insert"]>;
        Relationships: [];
      };
      outputs: {
        Row: {
          id: string;
          project_id: string;
          agent_run_id: string | null;
          parent_output_id: string | null;
          stage: "brief" | "direction" | "production" | "review" | "export";
          type: "brief_intelligence" | "territory" | "copy_system" | "visual_direction" | "shot_list" | "prompt_pack" | "qa_review" | "export_doc";
          title: string;
          content: Json;
          version: number;
          status: "draft" | "selected" | "approved" | "archived";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          agent_run_id?: string | null;
          parent_output_id?: string | null;
          stage: Database["public"]["Tables"]["outputs"]["Row"]["stage"];
          type: Database["public"]["Tables"]["outputs"]["Row"]["type"];
          title: string;
          content: Json;
          version?: number;
          status?: Database["public"]["Tables"]["outputs"]["Row"]["status"];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["outputs"]["Insert"]>;
        Relationships: [];
      };
      feedback_events: {
        Row: {
          id: string;
          project_id: string;
          output_id: string;
          feedback_type: string;
          instruction: string | null;
          before: Json | null;
          after: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          output_id: string;
          feedback_type: string;
          instruction?: string | null;
          before?: Json | null;
          after?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["feedback_events"]["Insert"]>;
        Relationships: [];
      };
      activity_events: {
        Row: {
          id: string;
          project_id: string;
          type: string;
          message: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          type: string;
          message: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["activity_events"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type Inserts<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
export type Updates<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];
