// import { clerkClient } from "@clerk/express";
// //Middleware to check userId and haspremium plan

// export const auth = async (req, res, next) => {
//     try {
//         const { userId, has } = await req.auth();
//         if (!userId) {
//             return res.status(401).json({
//                 success: false,
//                 message: "Unauthorized"
//             })
//         }
//         const hasPremiumPlan = await has({ plan: 'premium_user' });

//         const user = await clerkClient.users.getUser(userId);

//         if (!hasPremiumPlan && user.privateMetadata.free_usage) {
//             req.free_usage = user.privateMetadata.free_usage;
//         } else {
//             await clerkClient.users.updateUserMetadata(userId, {
//                 privateMetadata: {
//                     free_usage: 0
//                 }
//             })
//             req.free_usage = 0;
//         }
//         req.plan = hasPremiumPlan ? 'premium' : 'free';
//         next()
//     } catch (error) {
//         res.json({ success: false, message: error.message })
//     }
// }


// if error comes then use this
import { clerkClient, getAuth } from "@clerk/express";

export const auth = async (req, res, next) => {
   
    try {

        const { userId, has } = getAuth(req);

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const hasPremiumPlan = has({
            plan: "premium_user"
        });

        const user = await clerkClient.users.getUser(userId);

        if (!hasPremiumPlan) {

            req.free_usage =
                user.privateMetadata.free_usage || 0;

        } else {

            await clerkClient.users.updateUserMetadata(userId, {
                privateMetadata: {
                    free_usage: 0
                }
            });

            req.free_usage = 0;
        }

        req.plan = hasPremiumPlan ? "premium" : "free";

        next();

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

}
