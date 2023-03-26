import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  aws_s3 as S3,
  aws_rds as RDS,
  aws_ec2 as EC2,
  CfnOutput,
  Duration,
  RemovalPolicy,
} from "aws-cdk-lib";
import {
  Credentials,
  DatabaseInstance,
  DatabaseInstanceEngine,
  PostgresEngineVersion,
} from "aws-cdk-lib/aws-rds";
import {
  InstanceClass,
  InstanceSize,
  InstanceType,
  Peer,
  SecurityGroup,
  SubnetType,
} from "aws-cdk-lib/aws-ec2";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";

export class PeriateInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    console.log("props", props);

    const engine = DatabaseInstanceEngine.postgres({
      version: PostgresEngineVersion.VER_15,
    });
    const instanceType = InstanceType.of(InstanceClass.T3, InstanceSize.MICRO);
    const port = 5432;
    const dbName = "PeriateDB";

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

    new CfnOutput(this, "myVPCArn", { value: VPC.vpcId });

    const masterUserSecret = new Secret(this, "db-master-user-secret", {
      secretName: "db-master-user-secret",
      description: "Database master user credentials",
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: "postgres" }),
        generateStringKey: "password",
        passwordLength: 16,
        excludePunctuation: true,
      },
    });

    const myVpc = EC2.Vpc.fromLookup(this, "PeriateVPC", {});

    const dbSecurityGroup = new SecurityGroup(this, "Periate-DB-SG", {
      securityGroupName: "Periate-DB-SG",
      vpc: myVpc,
    });

    dbSecurityGroup.addIngressRule(
      Peer.ipv4(myVpc.vpcCidrBlock),
      EC2.Port.tcp(port),
      `Allow port ${port} for database connection from only within the VPC`
    );

    const dbInstance = new DatabaseInstance(this, "DB-1", {
      vpc: myVpc,
      vpcSubnets: { subnetType: SubnetType.PRIVATE_ISOLATED },
      instanceType,
      engine,
      port,
      securityGroups: [dbSecurityGroup],
      databaseName: dbName,
      credentials: Credentials.fromSecret(masterUserSecret),
      backupRetention: Duration.days(0),
      removalPolicy: RemovalPolicy.DESTROY,
    });

    masterUserSecret.attach(dbInstance);

    // The code that defines your stack goes here
    const bucket = new S3.Bucket(this, "QuestionAttachmentBucket", {
      blockPublicAccess: S3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      encryption: S3.BucketEncryption.S3_MANAGED,
    });

    new CfnOutput(this, "exampleBucketArn", { value: bucket.bucketArn });
  }
}
