import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAudioDataToAttempt1704024000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'attempts',
      new TableColumn({
        name: 'audioData',
        type: 'bytea',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('attempts', 'audioData');
  }
}
