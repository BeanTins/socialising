
Feature: Latest Messages

@business
@conversationlatestmessages
Scenario: no messages received
Given an existing conversation between Minnie's iPad and Beryl's iPhone
When Beryl's iPhone checks for messages
Then no messages are received

@business
@conversationlatestmessages
Scenario: one message received
Given an existing conversation between Minnie's iPad and Beryl's iPhone
And Minnie's iPad sends the message "where are you?" whilst Beryl's iPhone is offline, 
When Beryl's iPhone checks for messages
Then the message(s) is received
