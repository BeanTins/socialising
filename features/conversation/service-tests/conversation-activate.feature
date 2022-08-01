
Feature: Activate Conversation

@business
@conversationactivate
@conversation
Scenario: Conversation activated successfully
Given a pending conversation instigated by Minnie the Minx with their connection Beryl the Peril
When a validation connection response is received
Then the conversation is activated

