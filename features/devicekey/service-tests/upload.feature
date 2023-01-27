
Feature: Upload

@business
@devicekeyupload
Scenario: Device key uploaded
Given a new member
When they upload their public key
Then it is uploaded
