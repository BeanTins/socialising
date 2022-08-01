
Feature: Start Conversation

@business
@conversationcreate
@conversation
Scenario: Conversation not created if one participant
Given Billy Nomates wants a conversation on their own
When a request is made to create the conversation
Then the request is rejected

@business
@conversationstart
@conversation
Scenario: Conversation created successfully
Given Beryl the Peril wants a conversation with Minnie the Minx
When a request is made to create the conversation
Then the conversation is created

