import { Conversation } from "../conversation"

const mockUUid = jest.fn()
jest.mock("uuid", () => ({ v4: () => mockUUid() }))

beforeEach(() => {
    jest.clearAllMocks()
})

test("conversation create fails if initiating member not in participants", async () => {

  await expect(async () => {
    Conversation.create("1234", new Set(["5678", "7890"]))
  }).rejects.toThrow("Initiator 1234 not in the conversation")

})
