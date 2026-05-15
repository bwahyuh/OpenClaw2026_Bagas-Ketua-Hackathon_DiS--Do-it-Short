import {
  GoogleGenerativeAI,
  SchemaType,
  type Content,
  type FunctionDeclaration,
  type Part,
} from "@google/generative-ai";

export type AgentTool = {
  name: string;
  description: string;
  execute: (...args: unknown[]) => Promise<unknown>;
};

export type AgentOptions = {
  llm: string;
  apiKey?: string;
  systemPrompt: string;
  tools: AgentTool[];
};

export class Agent {
  private readonly model;
  private readonly tools: Map<string, AgentTool>;

  constructor(options: AgentOptions) {
    if (!options.apiKey) {
      throw new Error("GEMINI_API_KEY is required.");
    }

    const genAI = new GoogleGenerativeAI(options.apiKey);
    const declarations: FunctionDeclaration[] = options.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          input: {
            type: SchemaType.STRING,
            description: "Primary input for the tool",
          },
        },
        required: ["input"],
      },
    }));

    this.tools = new Map(options.tools.map((tool) => [tool.name, tool]));
    this.model = genAI.getGenerativeModel({
      model: options.llm,
      systemInstruction: options.systemPrompt,
      tools: [{ functionDeclarations: declarations }],
    });
  }

  async run(instruction: string): Promise<string> {
    const history: Content[] = [];
    let response = await this.model.generateContent({
      contents: [{ role: "user", parts: [{ text: instruction }] }],
    });

    for (let step = 0; step < 8; step++) {
      const candidate = response.response.candidates?.[0];
      const parts = candidate?.content?.parts ?? [];
      const functionCalls = parts.filter(
        (part): part is Part & { functionCall: NonNullable<Part["functionCall"]> } =>
          Boolean(part.functionCall?.name),
      );

      if (functionCalls.length === 0) {
        return response.response.text() ?? "";
      }

      history.push({ role: "model", parts });
      const toolResults: Part[] = [];

      for (const part of functionCalls) {
        const call = part.functionCall;
        const tool = this.tools.get(call.name);
        if (!tool) {
          toolResults.push({
            functionResponse: {
              name: call.name,
              response: { error: `Unknown tool: ${call.name}` },
            },
          });
          continue;
        }

        const args = (call.args ?? {}) as { input?: string };
        const output = await tool.execute(args.input ?? "");
        toolResults.push({
          functionResponse: {
            name: call.name,
            response: { output },
          },
        });
      }

      history.push({ role: "user", parts: toolResults });
      response = await this.model.generateContent({ contents: history });
    }

    return response.response.text() ?? "";
  }
}
