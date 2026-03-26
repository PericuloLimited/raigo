import type { RaigoPolicy, CompileResult } from "../types";
import { parseAndValidate } from "../validator";

// Import all adapters
import { compileOpenAI } from "../adapters/openai";
import { compileAnthropic } from "../adapters/anthropic";
import { compileCursor } from "../adapters/cursor";
import { compileCopilot } from "../adapters/copilot";
import { compileLangChain } from "../adapters/langchain";
import { compileN8N } from "../adapters/n8n";
import { compileNemo } from "../adapters/nemo";
import { compileGuardrailsAI } from "../adapters/guardrailsai";
import { compileAwsBedrock } from "../adapters/aws-bedrock";
import { compileAzureAI } from "../adapters/azure-ai";
import { compileDify } from "../adapters/dify";
import { compileFlowise } from "../adapters/flowise";
import { compileAutoGen } from "../adapters/autogen";
import { compileCrewAI } from "../adapters/crewai";
import { compileSemanticKernel } from "../adapters/semantic-kernel";
import { compileVertexAI } from "../adapters/vertex-ai";
import { compileCohere } from "../adapters/cohere";
import { compileMCP } from "../adapters/mcp";
import { compileGemini } from "../adapters/gemini";
import { compileMistral } from "../adapters/mistral";
import { compileHuggingFace } from "../adapters/huggingface";
import { compileLlamaIndex } from "../adapters/llamaindex";
import { compileHaystack } from "../adapters/haystack";
import { compileVellum } from "../adapters/vellum";
import { compilePaperclip } from "../adapters/paperclip";

export type CompileTarget =
  | "openai"
  | "anthropic"
  | "cursor"
  | "copilot"
  | "langchain"
  | "n8n"
  | "nemo"
  | "guardrailsai"
  | "aws-bedrock"
  | "azure-ai"
  | "dify"
  | "flowise"
  | "autogen"
  | "crewai"
  | "semantic-kernel"
  | "vertex-ai"
  | "cohere"
  | "mcp"
  | "gemini"
  | "mistral"
  | "huggingface"
  | "llamaindex"
  | "haystack"
  | "vellum"
  | "paperclip";

export const SUPPORTED_TARGETS: CompileTarget[] = [
  "openai",
  "anthropic",
  "cursor",
  "copilot",
  "langchain",
  "n8n",
  "nemo",
  "guardrailsai",
  "aws-bedrock",
  "azure-ai",
  "dify",
  "flowise",
  "autogen",
  "crewai",
  "semantic-kernel",
  "vertex-ai",
  "cohere",
  "mcp",
  "gemini",
  "mistral",
  "huggingface",
  "llamaindex",
  "haystack",
  "vellum",
  "paperclip",
];

const ADAPTERS: Record<CompileTarget, (policy: RaigoPolicy) => CompileResult> = {
  "openai": compileOpenAI,
  "anthropic": compileAnthropic,
  "cursor": compileCursor,
  "copilot": compileCopilot,
  "langchain": compileLangChain,
  "n8n": compileN8N,
  "nemo": compileNemo,
  "guardrailsai": compileGuardrailsAI,
  "aws-bedrock": compileAwsBedrock,
  "azure-ai": compileAzureAI,
  "dify": compileDify,
  "flowise": compileFlowise,
  "autogen": compileAutoGen,
  "crewai": compileCrewAI,
  "semantic-kernel": compileSemanticKernel,
  "vertex-ai": compileVertexAI,
  "cohere": compileCohere,
  "mcp": compileMCP,
  "gemini": compileGemini,
  "mistral": compileMistral,
  "huggingface": compileHuggingFace,
  "llamaindex": compileLlamaIndex,
  "haystack": compileHaystack,
  "vellum": compileVellum,
  "paperclip": compilePaperclip,
};

/**
 * Compile a .raigo YAML string to the specified target format.
 */
export function compile(yamlStr: string, target: CompileTarget): CompileResult {
  const { policy, result } = parseAndValidate(yamlStr);
  if (!policy || !result.valid) {
    const errorSummary = result.errors.map(e => `${e.path}: ${e.message}`).join("\n");
    throw new Error(`raigo validation failed:\n${errorSummary}`);
  }

  const adapter = ADAPTERS[target];
  if (!adapter) {
    throw new Error(`Unknown compile target: '${target}'. Supported targets: ${SUPPORTED_TARGETS.join(", ")}`);
  }

  return adapter(policy);
}

/**
 * Compile a .raigo YAML string to ALL supported target formats.
 */
export function compileAll(yamlStr: string): Record<CompileTarget, CompileResult> {
  const { policy, result } = parseAndValidate(yamlStr);
  if (!policy || !result.valid) {
    const errorSummary = result.errors.map(e => `${e.path}: ${e.message}`).join("\n");
    throw new Error(`raigo validation failed:\n${errorSummary}`);
  }

  const results = {} as Record<CompileTarget, CompileResult>;
  for (const target of SUPPORTED_TARGETS) {
    results[target] = ADAPTERS[target](policy);
  }
  return results;
}
