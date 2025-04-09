/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 *
 * @description
 * This script updates a custom transaction field with the entity's tax registration.
 *
 * @author Mosses Ross
 * @version 1.2
 * @date Mar 11 2025
 * @changelog Apr 8, 9 - Reviewed, removed unnecessary log messages, and minor optimizations
 *                  - Modified to support Sales Orders, Purchase Orders, and Quotes. Fixed Bugs.
 */

const modules = ['N/record', 'N/log']
define(modules, function (record, log) {
    function beforeSubmit(context) {
        if (context.type !== context.UserEventType.CREATE && context.type !== context.UserEventType.EDIT) {
            log.error("Execution Skipped", "Script execution skipped for event type: " + context.type);
            return;
        }

        try {
            var transactionType = context.newRecord.type;
            var entityType;
            var taxRegFieldName;

            if (transactionType === record.Type.SALES_ORDER) {
                entityType = record.Type.CUSTOMER;
                taxRegFieldName = 'custbody_cts_entity_tax_reg_no';
            } else if (transactionType === record.Type.PURCHASE_ORDER) {
                entityType = record.Type.VENDOR;
                taxRegFieldName = 'custbody_cts_vendor_tax_reg';
            } else {
                log.error("Unsupported Transaction Type", "Script execution skipped for transaction type: " + transactionType);
                return;
            }

            var transactionRecord = context.newRecord;
            var billCountry = transactionRecord.getValue({ fieldId: 'custbody_cts_bill_country' });
            var entityId = transactionRecord.getValue({ fieldId: 'entity' });

            if (!billCountry) {
                if (transactionType === record.Type.SALES_ORDER) {
                    billCountry = transactionRecord.getValue({ fieldId: 'billcountry' });
                }
                var subsidiaryId = transactionRecord.getValue({ fieldId: 'subsidiary' });
                if (subsidiaryId) {
                    var subsidiaryRecord = record.load({
                        type: record.Type.SUBSIDIARY,
                        id: subsidiaryId
                    });
                    countryCode = subsidiaryRecord.getValue({ fieldId: 'country' });
                    billCountry = countryCode;
                    transactionRecord.setValue({
                        fieldId: 'custbody_cts_bill_country',
                        value: billCountry
                    });  
                } else {
                    log.error({
                        title: 'Subsidiary Missing',
                        details: 'No Subsidiary found on Purchase Order, cannot determine Subsidiary Country.'
                    });
                }
            }

            var entityRecord = record.load({
                type: entityType,
                id: entityId
            });

            var lineCount = entityRecord.getLineCount({ sublistId: 'taxregistration' });
            var taxRegValue = null;

            for (var i = 0; i < lineCount; i++) {
                var taxRegCountry = entityRecord.getSublistValue({
                    sublistId: 'taxregistration',
                    fieldId: 'nexuscountry',
                    line: i
                });

                if (taxRegCountry === billCountry) {
                    taxRegValue = entityRecord.getSublistValue({
                        sublistId: 'taxregistration',
                        fieldId: 'taxregistrationnumber',
                        line: i
                    });
                    break;
                }
            }

            if (taxRegValue) {
                transactionRecord.setValue({
                    fieldId: taxRegFieldName,
                    value: taxRegValue
                });
            }
        } catch (e) {
            log.error({
                title: 'Error updating Tax Reg',
                details: e
            });
        }
    }

    return {
        beforeSubmit: beforeSubmit
    };
});