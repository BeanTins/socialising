
Feature: Download

@business
@devicekeydownload
Scenario: Device key downloaded
Given a member with a registered device
When I download their public key
Then it is downloaded
