/** Minimal Google Forms REST response. Text answers exist only during normalization. */
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
