# Drop unused index
ALTER TABLE `files` DROP INDEX `url`;
# Convert text column with only 4 distinct values into ENUM field
ALTER TABLE `files` ADD `file_type2` ENUM('baseband data', 'filterbank', 'HDF5', 'data' ) NULL DEFAULT NULL AFTER `file_type`;
update files set file_type2 = file_type;
ALTER TABLE `files` DROP `file_type`;
ALTER TABLE `files` CHANGE `file_type2` `file_type` ENUM('baseband data','filterbank','HDF5','data') CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL;
# Convert `project` field to ENUM (Only 3 distinct values found)
ALTER TABLE `files` ADD `project2` ENUM('GBT', 'Parkes', 'APF') NULL DEFAULT NULL AFTER `project`;
update files set project2=project;
ALTER TABLE `files` DROP `project`;
ALTER TABLE `files` CHANGE `project2` `project` ENUM('GBT','Parkes','APF') CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL;
# Add indexes
ALTER TABLE `files` ADD INDEX(`utc_observed`);
ALTER TABLE `files` ADD INDEX(`project`);
ALTER TABLE `files` ADD INDEX(`ra`);
ALTER TABLE `files` ADD INDEX(`decl`);
ALTER TABLE `files` ADD INDEX(`center_freq`);
ALTER TABLE `files` ADD INDEX(`file_type`);
ALTER TABLE `files` ADD INDEX(`size`);
ALTER TABLE `files` ADD INDEX(`target_name`);
# Defragment table `files` after all operations (https://dev.mysql.com/doc/refman/5.7/en/innodb-file-defragmenting.html)
ALTER TABLE files ENGINE=INNODB;
