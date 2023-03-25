import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  aws_s3 as S3,
  aws_rds as RDS,
  aws_ec2 as EC2,
  CfnOutput,
} from "aws-cdk-lib";
import { IpAddresses } from "aws-cdk-lib/aws-ec2";
import { Ec2Action } from "aws-cdk-lib/aws-cloudwatch-actions";

export class PeriateInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    const bucket = new S3.Bucket(this, "QuestionAttachmentBucket", {
      blockPublicAccess: S3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      encryption: S3.BucketEncryption.S3_MANAGED,
    });

    const VPC = new EC2.Vpc(this, "PeriateVPC", {
      maxAzs: 1,
      subnetConfiguration: [
        {
          cidrMask: 28,
          name: "rds",
          subnetType: EC2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    new CfnOutput(this, "exampleBucketArn", { value: bucket.bucketArn });
  }
}
