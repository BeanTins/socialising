
Feature: Read Receipt

@business
@conversationreadreceipt
Scenario: Read Receipt Acknowledgement
Given an existing conversation between Minnie's iPad and Beryl's iPhone
And Minnie's iPad sends the message "how is it going?" to Beryl's iPhone
When the message is read on Beryl's iPhone
Then Beryl is acknowledged as having read the message

