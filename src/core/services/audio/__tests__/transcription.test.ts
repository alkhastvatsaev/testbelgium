import { transcrireAppelSerrurier } from "../transcription";

const transcriptionsCreate = jest.fn();
const chatCreate = jest.fn();

jest.mock("openai", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    audio: {
      transcriptions: {
        create: transcriptionsCreate,
      },
    },
    chat: {
      completions: {
        create: chatCreate,
      },
    },
  })),
  toFile: jest.fn().mockResolvedValue({}),
}));

describe("Transcription Service (OpenAI Audio + dispatch JSON)", () => {
  const originalKey = process.env.OPENAI_API_KEY;

  beforeAll(() => {
    process.env.OPENAI_API_KEY = "sk-test";
  });

  afterAll(() => {
    process.env.OPENAI_API_KEY = originalKey;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    transcriptionsCreate.mockResolvedValue({ text: "Bonjour, j'ai une porte claquée." });
    chatCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              transcription: "Bonjour, j'ai une porte claquée.",
              probleme: "porte claquée",
              adresse: null,
              urgence: true,
              est_serrurerie: true,
            }),
          },
        },
      ],
    });
  });

  it("transcribes with audio.transcriptions then structures with chat", async () => {
    const dummyBuffer = Buffer.from("dummy audio");
    const result = await transcrireAppelSerrurier(dummyBuffer, "test.m4a");

    expect(transcriptionsCreate).toHaveBeenCalledTimes(1);
    expect(transcriptionsCreate.mock.calls[0][0]).toMatchObject({
      model: expect.any(String),
    });
    expect(transcriptionsCreate.mock.calls[0][0].file).toBeDefined();

    expect(chatCreate).toHaveBeenCalledTimes(1);
    expect(chatCreate.mock.calls[0][0]).toMatchObject({
      response_format: { type: "json_object" },
    });

    expect(result.analysis).toHaveProperty("transcription");
    expect(result.analysis.probleme).toBe("porte claquée");
    expect(result.analysis.urgence).toBe(true);
    expect(result.analysis.est_serrurerie).toBe(true);
    expect(result.rawTranscript).toContain("porte");
  });
});
