
Feature: Incoming Message

@business
@conversationincomingmessage
Scenario: Message sent successfully
Given an existing conversation between Minnie's iPad and Beryl's iPhone
When Minnie's iPad sends the message "welcome to BeanTins!" whilst Beryl's iPhone is online
Then Beryl's iPhone is immediately notified


