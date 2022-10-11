
Feature: Send Message

@business
@conversationsendmessage
Scenario: Message for unactivated conversation rejected
Given an unactivated conversation between Minnie's iPad and Beryl's iPhone
When Minnie's iPad sends the message "welcome to BeanTins!" to Beryl's iPhone
Then the message is rejected

@business
@conversationsendmessage
Scenario: Message sent successfully
Given an existing conversation between Minnie's iPad and Beryl's iPhone
When Minnie's iPad sends the message "welcome to BeanTins!" to Beryl's iPhone
Then the message is accepted

@business
@conversationsendmessage
Scenario: Messages sent successfully
Given an existing conversation between Minnie's iPad and Beryl's iPhone
When Minnie's iPad sends the message "welcome to BeanTins!" to Beryl's iPhone
And Minnie's iPad sends the message "how is it going?" to Beryl's iPhone
Then the messages are accepted

