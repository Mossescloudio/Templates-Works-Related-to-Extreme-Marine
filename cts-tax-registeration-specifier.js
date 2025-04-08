/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 *
 * @description
 * This script updates a custom transaction field 'custbody_cts_tax_reg'.
 based on the vendor's tax registration.

 * The script retrieves the 'Bill Country' from the PO and then searches
 the vendor's 'Tax Registrations' sublist for a matching country. If found,
 it copies the corresponding tax registration number
 to the 'custbody_cts_tax_reg' field on the PO.

 * @author Mosses Ross
 * @version 1.0
 * @date Mar 11 2025
 */

var record, log;
const modules = ['N/record', 'N/log']
define(modules, function (record, log) {
    function beforeSubmit(context) {
        if (context.type !== context.UserEventType.CREATE && context.type !== context.UserEventType.EDIT) {
            log.debug({
                title: "Script Execution Skipped",
                details: "Script execution skipped because the User Event type is not CREATE or EDIT. Current type: " + context.type
            });
            return;
        }

        try {
            var purchaseOrder = context.newRecord;
            var billCountry = purchaseOrder.getValue({ fieldId: 'custbody_cts_bill_country' });
            var vendorId = purchaseOrder.getValue({ fieldId: 'entity' });

            if (!billCountry) {
                var subsidiaryId = purchaseOrder.getValue({ fieldId: 'subsidiary' }); // Assuming 'subsidiary' is the field ID on PO
                if (subsidiaryId) {
                    var subsidiaryRecord = record.load({
                        type: record.Type.SUBSIDIARY,
                        id: subsidiaryId
                    });
                    countryCode = subsidiaryRecord.getValue({ fieldId: 'country' });
                    log.debug({
                        title: 'Subsidiary Country Found',
                        details: 'Subsidiary Country: ' + countryCode
                    });
                    purchaseOrder.setValue({
                        fieldId: "custbody_cts_bill_country",
                        value: countryCode
                    })
                    billCountry = countryCode;
                } else {
                    log.debug({
                        title: 'Subsidiary Missing',
                        details: 'No Subsidiary found on Purchase Order, cannot determine Subsidiary Country.'
                    });
                }
            }

            var vendorRecord = record.load({
                type: record.Type.VENDOR,
                id: vendorId
            });

            var lineCount = vendorRecord.getLineCount({ sublistId: 'taxregistration' });
            var taxRegValue = null;


            for (var i = 0; i < lineCount; i++) {
                var taxRegCountry = vendorRecord.getSublistValue({
                    sublistId: 'taxregistration',
                    fieldId: 'nexuscountry',
                    line: i
                });


                if (taxRegCountry === billCountry) {
                    taxRegValue = vendorRecord.getSublistValue({
                        sublistId: 'taxregistration',
                        fieldId: 'taxregistrationnumber',
                        line: i
                    });
                    break;
                }
            }

            if (taxRegValue) {
                purchaseOrder.setValue({
                    fieldId: 'custbody_cts_vendor_tax_reg',
                    value: taxRegValue
                });
            }
            log.debug({
                title: "End of Script Execution",
                details: "Variables at script end: " + JSON.stringify({
                    billCountry: billCountry,
                    vendorId: vendorId,
                    lineCount: lineCount,
                    taxRegValue: taxRegValue,
                    taxRegCountry: taxRegCountry
                })
            });


        } catch (e) {
            log.error({
                title: 'Error updating PO tax reg',
                details: e
            });
        }
    }

    return {
        beforeSubmit: beforeSubmit
    };
});