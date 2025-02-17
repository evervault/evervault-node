export type MatcherSpecificity = "wildcard" | "absolute";
export type MatcherType = "host" | "path";

export interface Target {
  rawValue: string;
  host: Matcher;
  path?: Matcher;
}

export interface Matcher {
  specificity: MatcherSpecificity;
  type: MatcherType;
  value: string;
}