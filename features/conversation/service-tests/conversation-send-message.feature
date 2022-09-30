
Feature: Send Message

@business
@conversationsendmessage
Scenario: Message sent
Given an existing conversation between Minnie's iPad and Beryl's iPhone
When Minnie's iPad sends the message "welcome to BeanTins!"
Then the message is accepted

