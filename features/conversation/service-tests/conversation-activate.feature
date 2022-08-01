
Feature: Activate Conversation

# @business
# @conversationstart
# @conversation
# Scenario: Conversation not started if instigator is not connected to other
# Given Beryl the Peril is not connected to Rodger the Dodger
# When a request is made to start a conversation between them
# Then a failure response occurs

@business
@conversationactivate
@conversation
Scenario: Conversation activated successfully
Given a pending conversation instigated by Minnie the Minx with their connection Beryl the Peril
When a validation connection response is received
Then the conversation is activated

