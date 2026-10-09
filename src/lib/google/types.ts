/** Minimal Google Forms REST response. Free-text responses are stored with their identified evaluation. */
export interface GoogleFormResponse {
  responseId: string;
  createTime?: string;
  lastSubmittedTime: string;
  respondentEmail?: string;
  answers?: Record<string, {
    questionId?: string;
    textAnswers?: { answers?: { value: string }[] };
  }>;
}

export interface GoogleQuestion {
  questionId?: string;
  scaleQuestion?: { low: number; high: number };
  textQuestion?: { paragraph?: boolean };
  ratingQuestion?: { ratingScaleLevel: number };
  choiceQuestion?: { type?: string; options?: { value: string }[] };
  rowQuestion?: { title?: string };
}

export interface GoogleForm {
  formId?: string;
  info?: { title?: string; documentTitle?: string };
  responderUri?: string;
  settings?: { emailCollectionType?: string };
  items?: {
    title?: string;
    pageBreakItem?: object;
    questionItem?: { question?: GoogleQuestion };
    questionGroupItem?: {
      questions?: GoogleQuestion[];
      grid?: { columns?: GoogleQuestion['choiceQuestion'] };
    };
  }[];
}
