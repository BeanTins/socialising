
Feature: Latest Read Receipt

@business
@conversationlatestreadreceipts
Scenario: Read Receipt Acknowledgement
Given an existing conversation between Minnie's iPad and Beryl's iPhone
And the message "how is it going?" sent from Minnie's iPad is read on Beryl's iPhone
When the latest read receipts are requested on Minnie's iPad
Then Minnie has read the message

