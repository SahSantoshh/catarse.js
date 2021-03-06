/**
 * window.c.projectReport component
 * Render project report form
 *
 */
import m from 'mithril';
import postgrest from 'mithril-postgrest';
import models from '../models';
import h from '../h';
import projectVM from '../vms/project-vm';

const projectReport = {
    controller(args) {
        let displayForm = h.toggleProp(false, true),
            sendSuccess = m.prop(false),
            submitDisabled = m.prop(false),
            user = h.getUser() || {},
            email = m.prop(user.email),
            details = m.prop(''),
            reason = m.prop(''),
            l = m.prop(false),
            storeReport = 'report',
            project = projectVM.currentProject(),
            hasPendingAction = project && (h.callStoredAction(storeReport) == project.project_id),
            checkLogin = () => {
                if (!_.isEmpty(user)) {
                    displayForm.toggle();
                } else {
                    h.storeAction(storeReport, project.project_id);
                    return h.navigateToDevise();
                }
            },
            sendReport = () => {
                submitDisabled(true);
                const loaderOpts = models.projectReport.postOptions({
                    email: email(),
                    details: details(),
                    reason: reason(),
                    project_id: project.project_id
                });
                l = postgrest.loaderWithToken(loaderOpts);

                l.load().then(sendSuccess(true));
                submitDisabled(false);
                return false;
            },
            checkScroll = (el, isInit) => {
                if (!isInit && hasPendingAction) {
                    h.animateScrollTo(el);
                }
            };


        if (!_.isEmpty(user) && hasPendingAction) {
            displayForm(true);
        }

        return {
            checkScroll,
            checkLogin,
            displayForm,
            sendSuccess,
            submitDisabled,
            sendReport,
            user,
            email,
            details,
            reason
        };
    },

    view(ctrl, args) {
        const user = ctrl.user;

        return m('.card.card-terciary.u-radius',
            [
                m('.fontsize-small.u-marginbottom-20',
                    [
                        'This campaign disrespects',
                        m.trust('&nbsp;'),
                        m('a.alt-link[href=\'http://www.grasruts.com/rules\'][target=\'_blank\']',
                            ' our rules? '
                          )
                    ]
                      ),
                ctrl.sendSuccess() ?
                       m('.w-form',
                        m('p',
                          'Thank you! Your report has been received.'
                        )
                      ) :
                [
                    m('.a.w-button.btn.btn-medium.btn-terciary.btn-inline[href=\'javascript:void(0);\']', { onclick: ctrl.checkLogin },
                        'Report this campaign'
                      ),
                    ctrl.displayForm() ? m('#report-form.u-margintop-30',
                        m('.w-form',
                          m('form', { onsubmit: ctrl.sendReport, config: ctrl.checkScroll },
                              [
                                  m('.fontsize-small.fontweight-semibold.u-marginbottom-10',
                                'Why are you denouncing this campaign?'
                              ),
                                  m('select.w-select.text-field.positive[required=\'required\']', { onchange: m.withAttr('value', ctrl.reason) },
                                      [
                                          m('option[value=\'\']',
                                              'Select a reason'
                                          ),
                                          m('option[value=\'Intellectual Property infringement\']',
                                              'Intellectual Property infringement'
                                          ),
                                          m('option[value=\'Slander, libel, defamation or discrimination\']',
                                              'Slander, libel, defamation or discrimination'
                                          ),
                                          m('option[value=\'Prohibited campaign scope\']',
                                              'Prohibited campaign scope'
                                          ),
                                          m('option[value=\'Forbidden Rewards\']',
                                              'Forbidden Rewards'
                                          ),
                                          m('option[value=\'Explicit free sex scenes\']',
                                              'Explicit free sex scenes'
                                          ),
                                          m('option[value=\'SPAM abuse\']',
                                              'SPAM abuse'
                                          ),
                                          m('option[value=\'Others\']',
                                              'Others'
                                            )
                                      ]
                              ),
                                  m('textarea.w-input.text-field.positive.u-marginbottom-30', { placeholder: 'Please give more details to help us identify the problem', onchange: m.withAttr('value', ctrl.details) }),
                                  m('input.w-button.btn.btn-medium.btn-inline.btn-dark[type=\'submit\'][value=\'Send Complaint\']', { disabled: ctrl.submitDisabled() })
                              ]
                          )
                        )
                      ) : '']

            ]
                  );
    }
};

export default projectReport;
