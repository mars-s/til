/// NLP rule engine — loads TOML rule configs and runs regex pipelines.
/// Each rule matches a pattern in the input string and records a Span.

use crate::types::{Span, SpanKind};
use anyhow::Result;
use regex::Regex;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct Rule {
    pub name: String,
    pub pattern: String,
    pub sets: String,
    pub span_kind: String,
    #[serde(default)]
    pub value: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RuleSet {
    pub rules: Vec<Rule>,
}

impl RuleSet {
    pub fn from_toml(toml_str: &str) -> Result<Self> {
        Ok(toml::from_str(toml_str)?)
    }
}

pub struct CompiledRule {
    pub rule: Rule,
    pub regex: Regex,
}

impl CompiledRule {
    pub fn compile(rule: Rule) -> Result<Self> {
        let regex = Regex::new(&rule.pattern)?;
        Ok(CompiledRule { rule, regex })
    }

    pub fn find_span(&self, input: &str) -> Option<Span> {
        let m = self.regex.find(input)?;
        Some(Span {
            start: m.start(),
            end: m.end(),
            kind: parse_span_kind(&self.rule.span_kind),
        })
    }

    pub fn captures<'a>(&self, input: &'a str) -> Option<regex::Captures<'a>> {
        self.regex.captures(input)
    }
}

pub fn parse_span_kind(s: &str) -> SpanKind {
    match s {
        "Time" => SpanKind::Time,
        "Date" => SpanKind::Date,
        "Duration" => SpanKind::Duration,
        "Priority" => SpanKind::Priority,
        "Tag" => SpanKind::Tag,
        "Recurrence" => SpanKind::Recurrence,
        _ => SpanKind::Tag,
    }
}
