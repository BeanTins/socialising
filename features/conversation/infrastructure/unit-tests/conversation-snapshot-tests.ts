import { Conversation, State} from "../../domain/conversation"
import { ConversationSnapshot} from "../conversation-snapshot"

test("snapshot to conversation", async() => {

  const snapshot = new ConversationSnapshot()
  snapshot.initiatingMemberId = "1234"
  snapshot.id = "123e4567-e89b-12d3-a456-426614174000"
  snapshot.name = "software craft chat"
  snapshot.participantIds = new Set(["1234", "4321"])
  snapshot.adminIds = new Set(["1234"])
  snapshot.state = State.Activated

  var conversation = snapshot.toConversation()
  expect(conversation["initiatingMemberId"]).toBe("1234")
  expect(conversation["name"]).toBe("software craft chat")
  expect(conversation["participantIds"]).toEqual(new Set(["1234", "4321"]))
  expect(conversation["adminIds"]).toEqual(new Set(["1234"]))
  expect(conversation["id"]).toBe("123e4567-e89b-12d3-a456-426614174000")
  expect(conversation["state"]).toBe("Activated")
})

test("snapshot to conversation with null name", async() => {

  const snapshot = new ConversationSnapshot()
  snapshot.initiatingMemberId = "1234"
  snapshot.id = "123e4567-e89b-12d3-a456-426614174000"
  snapshot.name = ""
  snapshot.participantIds = new Set(["1234", "4321"])
  snapshot.adminIds = new Set(["1234"])

  var conversation = snapshot.toConversation()
  expect(conversation["name"]).toBe("")
})

test("conversation to snapshot", async() => {
  
  var conversation: Conversation = Conversation.create("1234", new Set(["1234", "4321"]), "knitting club", new Set(["1234"]))

  const snapshot = ConversationSnapshot.createFromConversation(conversation)

  expect(snapshot.initiatingMemberId).toEqual("1234")
  expect(snapshot.name).toBe("knitting club")
  expect(snapshot.participantIds).toEqual(new Set(["1234", "4321"]))
  expect(snapshot.adminIds).toEqual(new Set(["1234"]))
  expect(snapshot.state).toBe("Created")
})

test("conversation to snapshot with null name", async() => {
  
  var conversation: Conversation = Conversation.create("1234", new Set(["1234", "4321"]), null, new Set(["1234"]))

  const snapshot = ConversationSnapshot.createFromConversation(conversation)

  expect(snapshot.name).toBe("")
})

test("conversation to snapshot makes non-persisted properties as undefined", async() => {
  
  var conversation: Conversation = Conversation.create("1234", new Set(["1234", "4321"]), null, new Set(["1234"]))

  conversation["newMessage"] = {
    id: "09040739-830c-49d3-b8a5-1e6c9270fdb2",
    senderMemberId: "ce79fbb9-b68f-4cd2-a4ff-da31e3f8fb21",
    senderDeviceId: "c834163e-502b-4e63-8cab-294bf13a560b",
    date: 0,
    encryptions: [
      {recipientDeviceId: "5b74b221-1be7-4c18-91ac-0121ae0cee77",
       recipientMemberId: "eda0eabe-6c2b-474f-9dde-d6a67232721a",
       message: "garbled encryption"},
       {recipientDeviceId: "5a072b0f-2d69-4809-acb7-f408cafed0db",
       recipientMemberId: "6f4386fe-bbff-4684-b0f7-698600ba8eb9",
       message: "garbled encryption"},
    ]
  }
  const snapshot = ConversationSnapshot.createFromConversation(conversation)

  expect(snapshot.newMessage).toBeUndefined()
})

test("raw data to snapshot", async() => {
  
  const snapshot = ConversationSnapshot.createFromRawData({
    id: "09040739-830c-49d3-b8a5-1e6c9270fdb2", 
    name: "test",
    initiatingMemberId: "49070739-630c-2223-c8a5-2e6c9270fdb2",
    participantIds: new Set(["49070739-630c-2223-c8a5-2e6c9270fdb2", "79070739-630c-4423-c8a5-2e6c9270fdb2"]),
    adminIds: new Set(["49070739-630c-2223-c8a5-2e6c9270fdb2"]),
    state: "Created"}
  )

  expect(snapshot.id).toBe("09040739-830c-49d3-b8a5-1e6c9270fdb2")
  expect(snapshot.name).toBe("test")
  expect(snapshot.initiatingMemberId).toBe("49070739-630c-2223-c8a5-2e6c9270fdb2")
  expect(snapshot.participantIds).toEqual(new Set(["49070739-630c-2223-c8a5-2e6c9270fdb2", "79070739-630c-4423-c8a5-2e6c9270fdb2"]))
  expect(snapshot.adminIds).toEqual(new Set(["49070739-630c-2223-c8a5-2e6c9270fdb2"]))
  expect(snapshot.state).toBe("Created")
})

test("raw data admin ids null to empty", async() => {
  
  const snapshot = ConversationSnapshot.createFromRawData({
    adminIds: null}
  )

  expect(snapshot.adminIds).toEqual(new Set([]))
})

test("snapshot has identical set of properties to conversation", async() => {
  
  const conversation = Conversation.create("1234", new Set(["1234", "4321"]), "knitting club", new Set(["1234"]))
  const malformedMemberSnapshot = new ConversationSnapshot()
  const snapshot = ConversationSnapshot.createFromConversation(conversation)

  const memberKeys = Object.keys(conversation) as Array<string>
  const memberSnapshotKeys = Object.keys(snapshot) as Array<string>
  const snapshotWithoutUndefinedProperties = memberSnapshotKeys.filter(function(value, index, arr){ 
    return (value != "newMessage")
  })

  const malformedMemberSnapshotKeys = Object.keys(malformedMemberSnapshot) as Array<keyof MalformedConversationMemberSnapshot>

  expect(memberKeys).toEqual(snapshotWithoutUndefinedProperties)
  expect(memberSnapshotKeys).not.toEqual(malformedMemberSnapshotKeys)
})

class MalformedConversationMemberSnapshot extends ConversationSnapshot{
  private spuriousProperty: string = ""
}



