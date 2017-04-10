from __future__ import print_function
from boto3 import resource
from boto3 import client
from botocore.exceptions import ClientError


# Manage security groups.

# Delete all security groups created with launch wizard.
# Remove all rules open to entire world (change to just Corporate network).



def main(event, context):


    #Instantiate client.
    ec2 = resource("ec2", region_name='us-east-1')
    ec2client = client("ec2")


    launchwizard_count = 0

    ## Retrieve all security groups.
    all_groups = ec2client.describe_security_groups()['SecurityGroups']
    deleted = []
    launch_wizard_sgs = []
    open_sgs = []
    groups_in_use = []
    deld = False

    # Loop through all groups
    for sg in all_groups:

        # Get ec2 security group object for group ID.
        security_group = ec2.SecurityGroup(sg['GroupId'])

        #Loop through all permissions of security group
        for permission in security_group.ip_permissions:
            #print(permission)
            protocol = permission['IpProtocol']

            # Only look for port range if it's a TCP rule
            if protocol == 'tcp':
                from_port = permission['FromPort']
                to_port = permission['ToPort']

            #Loop through all IP CIDR ranges, check if open to world.
            for ip_range in permission['IpRanges']:
                if ip_range['CidrIp'] == '0.0.0.0/0':
                    open_sgs.append(security_group.group_name)
                    if protocol == 'tcp':
                        # Remove existing rule for 0.0.0.0/0, apply identical rule but for 192.168.0.0/20
                        security_group.authorize_ingress(IpProtocol="tcp", 192.168.0.0/20', FromPort=from_port, ToPort=to_port)
                        security_group.revoke_ingress(IpProtocol="tcp", CidrIp='0.0.0.0/0', FromPort=from_port, ToPort=to_port)
                            
        
                ## Check if created with launch wizard.
        if('launch-wizard' in security_group.group_name):
            launch_wizard_sgs.append(security_group.group_name)

            # Delete security group, set flag to True in order to skip rule-check.
            try:
                security_group.delete()
                deleted.append(security_group.group_name)
                deld = True
            except ClientError as e:
                groups_in_use.append(security_group.group_name)
                continue
            
            
  
    print("Number of groups with 'launch-wizard' in name: ", len(launch_wizard_sgs))
    print("Number of groups with inbound rules open to '0.0.0.0/0': ", len(open_sgs))

    print("Groups with 'launch-wizard' in name: ", launch_wizard_sgs)
    print("Groups with inbound rules open to '0.0.0.0/0': ", open_sgs)

    print("Deleted security groups: ", deleted)
    print("Groups that couldn't be deleted, are in use: ", groups_in_use)    
